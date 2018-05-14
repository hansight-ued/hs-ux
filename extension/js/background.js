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
  // console.log('new port connected', id, port.sender.tab.id);
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

class PointsManager {
  constructor(remote, id)  {
    this.id = id;
    this.remote = remote;
    this.points = [];
    this.onIntHandler = this.onInt.bind(this);
    this.tm = setTimeout(this.onIntHandler, 3000);
  }
  onInt() {
    this.tm = null;
    try {
      this._upload().then(() => fn.call(this), () => fn.call(this));
    } catch(ex) {
      console.error(ex);
      fn.call(this);
    }
    function fn() {
      if (this.id && !this.tm) {
        this.tm = setTimeout(this.onIntHandler, 3000);
      }
    }
  }
  stop() {
    if (this.tm) {
      clearTimeout(this.tm);
      this.tm = null;
    }
    this._upload(true);
    this.id = null;
  }
  add(point) {
    this.points.push(point);
  }
  _upload() {
    if (this.points.length === 0) return;
    const points = this.points.slice();
    this.points.length = 0;
    return this._doUpload(points);
  }
  _doUpload(points) {
    return this._fetch('ux/records/' + this.id + '/points', {
      method: 'POST',
      data: { points }
    });
  }
  _fetch(url, options) {
    return fetch2(joinUrl(this.remote, '__api', url), options);
  }
}
class UploadManager {
  constructor(remote, id) {
    this.id = id;
    this.remote = remote;
    this.queue = [];
    this.state = 'running';
    this.isUploading = false;
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
    this._doUpload(blob);
  }
  _stop() {
    this._doStop();
  }
  _doStop() {
    return this._fetch(`ux/records/${this.id}/stop`, {
      method: 'PUT'
    });
  }
  _doUpload(blob) {
    return this._fetch(`ux/records/${this.id}/upload`, {
      method: 'POST',
      data: blob
    }).then(() => {
      this.isUploading = false;
      this._schedule();
    }, err => {
      this.state = 'error';
      this.queue.length = 0; // clear
    });
  }
  _fetch(url, options) {
    return fetch2(joinUrl(this.remote, '__api', url), options);
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
  onMouseMove(x, y, w, h) {
    if (!this.curRecord || this.curRecord.startTime <= 0) return;
    this.curRecord.pointer && this.curRecord.pointer.add({
      type: 10,
      x, y, w, h,
      timestamp: Date.now()
    });
  }
  setUXRemote(uxRemote) {
    this.uxRemote = uxRemote;
  }
  startRecord(id, tag) {
    if (this.curRecord) this.stopRecord();
    this.curRecord = {
      id,
      tag,
      startTime: 0,
      pointer: null,
      uploader: null,
      state: 'waiting'      
    };
    if (this.stream) {
      return this._doStartRecord();
    }
    chrome.tabCapture.capture({
      video: true,
      videoConstraints: {
        mandatory: {
          maxFrameRate: 24
        }
      },
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
    this.curRecord.startTime = Date.now();
    this.curRecord.pointer = new PointsManager(this.uxRemote, this.curRecord.id);
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
    const pointer = this.curRecord.pointer;
    pointer && pointer.stop();
    this.curRecord.pointer = null;
    const recorder = this.curRecord.recorder;
    recorder && recorder.stop();
    this.curRecord.recorder = null;
    this.curRecord = null;    
  }
  _fetch(url, options) {
    return fetch2(joinUrl(this.uxRemote, '__api', url), options);
  }
  _onRecordData(evt) {
    if (!this.curRecord || !this.curRecord.uploader) return;
    if (!evt.data || !this.uxRemote) return;
    console.log('recorder data come', evt);
    this.curRecord.uploader.addBlob(evt.data);
  }
}
