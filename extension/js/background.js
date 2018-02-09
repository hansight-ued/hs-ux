const supportedMimeType = (function() {
  const MIME_TYPES = ['video/webm', 'video/mp4'];  
  for(let i = 0; i < MIME_TYPES.length; i++) {
    if (MediaRecorder.isTypeSupported(MIME_TYPES[i]))
      return MIME_TYPES[i];
  }
  return null;
})();

const createObjectID = (function() {
  const MACHINE_ID = parseInt(Math.random() * 0xFFFFFF, 10);
  const pid = Math.floor(Math.random() * 100000) % 0xFFFF;
  let index = parseInt(Math.random() * 0xFFFFFF, 10);

  function generate() {
    return hex(8, Date.now() / 1000 | 0) + hex(6,MACHINE_ID) + hex(4,pid) + hex(6,next());
  }
  function hex(length, n) {
    n = n.toString(16);
    return (n.length===length)? n : '00000000'.substring(n.length, length) + n;
  }
  function next() {
    return index = (index+1) % 0xFFFFFF;
  }
  return generate;
})();

const clients = new Map();
const tabs = new Map();

chrome.runtime.onConnect.addListener(function(port) {
  if (!port || typeof port !== 'object' || port.name !== 'HANSIGHT_UX') return;
  const id = createObjectID();
  const client = new Client(id, port);
  clients.set(id, client);
  tabs.set(client.tabId, client);
  console.log('new port connected', id, port.sender.tab.id);

});

chrome.browserAction.onClicked.addListener(tab => {
  const client = tabs.get(tab.id);
  client && client._postMessage('activeTab');
});

const HTTP_REG = /^http(?:s?):\/\//;
function joinUrl(...args) {
  if (args.length === 0) return '';
  let p = '';
  args[0] = args[0].replace(HTTP_REG, m => {
    p = m;
    return '';
  });
  return p + (args.join('/').replace(/\/+/g, '/'));
}


class UploadManager {
  constructor(remote, id) {
    this.id = id;
    this.remote = remote;
    this.queue = [];
    this.state = 'running';
    this.isUploading = false;
    this.tries = 0;
  }
  addBlob(blob) {
    if (this.state === 'error' || this.state === 'stopped') return;
    this.queue.push(blob);
    this._schedule();
  }
  stop() {
    this.state = 'stopped';
    if (this.isUploading) return;
    if (this.queue.length > 0) return this._upload();
    return this._stop();
  }
  _schedule() {
    if (this.isUploading || this.state === 'error') return;
    if (this.queue.length > 0) this._upload();
    if (this.state === 'stopped') return this.stop();    
  }
  _upload() {
    const blob = this.queue.shift();
    this.isUploading = true;
    this.tries = 20;
    this._doUpload(blob);
  }
  _stop() {
    this.tries = 0;
    this._doStop();
  }
  _doStop() {
    this._fetch(`ux/records/${this.id}/stop`, {
      method: 'PUT'
    }).catch(err => {
      this.tries++;
      if (this.tries <= 20) {
        setTimeout(() => {
          this._doStop();
        }, 500);
      }
    })
  }
  _doUpload(blob) {
    this._fetch(`ux/records/${this.id}/upload`, {
      method: 'POST',
      data: blob
    }).then(() => {
      this.isUploading = false;
      this._schedule();
    }, err => {
      this.tries++;
      if (this.tries <= 20) {
        setTimeout(() => {
          this._doUpload(blob);
        }, 500);
      } else {
        this.state = 'error';
        this.queue.length = 0; // clear
      }
    });
  }
  _fetch(url, options) {
    return fetch2(joinUrl(this.remote, url), options);
  }
}
class Client {
  constructor(id, port) {
    this.id = id;
    this.tabId = port.sender.tab.id;
    this.port = port;
    this.stream = null;
    this.onMessageHandler = this.onMessage.bind(this);
    this.onDisconnectHandler = this.onDisconnect.bind(this);
    this.curRecord = null;
    this.uxRemote = null;
    this.initialize();
  }
  initialize() {
    this.port.onMessage.addListener(this.onMessageHandler);
    this.port.onDisconnect.addListener(this.onDisconnectHandler);
  }
  onDisconnect() {
    this.stopRecord();
    if (this.stream) {
      // shutdown stream
      // console.log('shutdown stream');
      const tracks = this.stream.getTracks();
      for (let i = 0; i < tracks.length; ++i) {
        tracks[i].stop();
      }
    }
    // console.log('port disconnected', this.id);
    this.port.onMessage.removeListener(this.onMessageHandler);
    this.port.onDisconnect.removeListener(this.onDisconnectHandler);
    this.port = null;
    clients.delete(this.id);
    tabs.delete(this.tabId);
  }
  _postMessage(type, data) {
    const msg = { type: `HANSIGHT_UX_${type}` };
    if (typeof data !== 'undefined') msg.data = data;
    this.port && this.port.postMessage(msg);
  }
  onMessage(msg) {
    if (!msg || typeof msg !== 'object') return;
    if (typeof msg.type !== 'string' || !msg.type.startsWith('HANSIGHT_UX_')) return;
    // console.log('receive port message', msg);
    const funcName = msg.type.substring(12);
    if (typeof this[funcName] === 'function') {
      const args = Array.isArray(msg.data) ? msg.data : (msg.data ? [msg.data] : []);
      this[funcName].apply(this, args);
    }
  }
  setUXRemote(uxRemote) {
    this.uxRemote = uxRemote;
  }
  startRecord(id, tag) {
    if (this.curRecord) this.stopRecord();
    this.curRecord = {
      id,
      tag,
      state: 'waiting',
      uploader: null
    };
    if (this.stream) {
      return this._doStartRecord();
    }
    chrome.tabCapture.capture({
      video: true,
      audio: false
    }, stream => {
      if (!stream) {
        console.error(chrome.runtime.lastError);
        return this.stopRecord();
      }
      this.stream = stream;
      this._doStartRecord();        
    });
  }
  _doStartRecord() {
    this._fetch('ux/records', {
      method: 'POST',
      data: {
        id: this.curRecord.id,
        tag: this.curRecord.tag,
        mimeType: supportedMimeType
      }
    }).then(result => {
      this._recordStream();
    }, err => {
      console.error(err);
      this.stopRecord();
    });
  }
  _recordStream() {
    const recorder = new MediaRecorder(this.stream, {
      mimeType: supportedMimeType
    });
    recorder.ondataavailable = e => {
      if (!this.curRecord) {
        console.error('data come after stopped');
        return;
      }
      this._onRecordData(e);
    };
    recorder.onstop = () => {
      // console.log('recorder stopped');
      clear();
      this._doStopRecord();
    };
    recorder.onerror = err => {
      // console.log('recorder err', err);
      clear();
      this._doStopRecord();
    };
    function clear() {
      recorder.onstop = null;
      recorder.ondataavailable = null;
      recorder.onerror = null;
    }
    recorder.start(3000);
    // console.log('recorder started');
    this.curRecord.recorder = recorder;
    this.curRecord.state = 'recording';
    this.curRecord.uploader = new UploadManager(this.uxRemote, this.curRecord.id);
  }
  stopRecord() {
    if (!this.curRecord) return;
    this.curRecord.state = 'stopped';
    const recorder = this.curRecord.recorder;
    this.curRecord.recorder = null;
    if (recorder) {
      // stop 函数会触发 stop 事件
      // stop 事件处理时会调用 _doStopRecord 清理
      recorder.stop();
    } else {
      this._doStopRecord();
    }
  }
  _doStopRecord(recordId) {
    if (!this.curRecord) return;
    const uploader = this.curRecord.uploader;
    uploader && uploader.stop();
    this.curRecord.uploader = null;
    const recorder = this.curRecord.recorder;
    recorder && recorder.stop();
    this.curRecord.recorder = null;
    this.curRecord = null;    
  }
  _fetch(url, options) {
    return fetch2(joinUrl(this.uxRemote, url), options);
  }
  _onRecordData(evt) {
    if (!this.curRecord || !this.curRecord.uploader) return;
    if (!evt.data || !this.uxRemote) return;
    // console.log('recorder data come', evt.data);
    this.curRecord.uploader.addBlob(evt.data);
  }
}
