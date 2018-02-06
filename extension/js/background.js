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

class Client {
  constructor(id, port) {
    this.id = id;
    this.tabId = port.sender.tab.id;
    this.port = port;
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
    console.log('port disconnected', this.id);
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
    console.log('receive port message', msg);
    const funcName = msg.type.substring(12);
    if (typeof this[funcName] === 'function') {
      const args = Array.isArray(msg.data) ? msg.data : (msg.data ? [msg.data] : []);
      this[funcName].apply(this, args);
    }
  }
  setUXRemote(uxRemote) {
    this.uxRemote = uxRemote;
  }
  startRecord(recordId) {
    if (this.curRecord) this.stopRecord();
    this.curRecord = {
      id: recordId,
      state: 'waiting'
    };
    chrome.tabCapture.capture({
      video: true,
      audio: false
    }, stream => {
      if (!stream) {
        console.error(chrome.runtime.lastError);
        this.stopRecord();
        return;
      }
      const recorder = new MediaRecorder(stream);
      // const chunks = [];
      recorder.ondataavailable = e => {
        if (!this.curRecord) return;
        this._onRecordData(e);
      };
      recorder.onstop = () => {
        console.log('recorder stopped');
        this.stopRecord();
      };
      recorder.onerror = err => {
        console.log('recorder err', err);
        this.stopRecord();
      };
      recorder.start(2000);
      console.log('recorder started');
      this.curRecord.recorder = recorder;
      this.curRecord.state = 'recording';    
    });
  }
  stopRecord(recordId) {
    if (!this.curRecord || this.curRecord.state !== 'recording') {
      this.curRecord = null;
      return;
    }
    const recorder = this.curRecord.recorder;
    this.curRecord = null;
    console.log('try stop record');
    recorder.stop();
  }
  _fetch(url, options) {
    return fetch2(joinUrl(this.uxRemote, url), options);
  }
  _onRecordData(evt) {
    if (!evt.data) return;
    console.log('recorder data come', evt.data);
    if (!this.uxRemote) {
      console.error('uxRemote is not set');
      return;
    }
    this._fetch('ux/records', {
      method: 'POST',
      query: {
        sessionId: this.id,
        recordId: this.curRecord.id,
        mimeType: evt.data.type
      },
      data: evt.data
    }).then(data => {
      console.log(data);
    }, err => {

    });
  }
}
