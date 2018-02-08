const createObjectID = (function() {
  const MACHINE_ID = parseInt(Math.random() * 0xFFFFFF, 10);
  const pid = Math.floor(Math.random() * 100000) % 0xFFFF;
  let index = parseInt(Math.random() * 0xFFFFFF, 10);
  
  function generate() {
    return hex(8, Date.now() / 1000 | 0) + hex(6,MACHINE_ID) + hex(4,pid) + hex(6,next());
  }
  function hex(length, n) {
    n = n.toString(16);
    return (n.length===length)? n : "00000000".substring(n.length, length) + n;
  }
  function next() {
    return index = (index+1) % 0xFFFFFF;
  }
  return generate;
})();

let clientTries = 0;

const supportedMimeType = (function() {
  const MIME_TYPES = ['video/webm', 'video/mp4'];  
  for(let i = 0; i < MIME_TYPES.length; i++) {
    if (MediaRecorder.isTypeSupported(MIME_TYPES[i]))
      return MIME_TYPES[i];
  }
  return null;
})();

class Client {
  constructor() {
    this.port = null;
    this.onMessageHandler = this.onMessage.bind(this);
    this.onDisconnectHandler = this.onDisconnect.bind(this);
    this.onWindowUnloadHandler = this.onWindowUnload.bind(this);
    this.onWindowMessageHandler = this.onWindowMessage.bind(this);
    this.curRecord = null;
    this.uxRemote = null;
    this.initialize();
  }
  initialize() {
    if (this.port) return;
    this.port = chrome.runtime.connect({ name: 'HANSIGHT_UX' });
    this.port.onMessage.addListener(this.onMessageHandler);
    this.port.onDisconnect.addListener(this.onDisconnectHandler);
    window.addEventListener('unload', this.onWindowUnloadHandler, false);
    window.addEventListener('message', this.onWindowMessageHandler, false);
  }
  isInstalled(uxRemote) {
    if (!supportedMimeType) return;
    this.uxRemote = uxRemote;
    this._postWindowMessage('foundInstalled');
    this._postPortMessage('setUXRemote', this.uxRemote);
  }
  destroy() {
    if (!this.port) return;
    window.removeEventListener('unload', this.onWindowUnloadHandler);
    window.removeEventListener('message', this.onWindowMessageHandler);
    this.port.onMessage.removeListener(this.onMessageHandler);
    this.port.onDisconnect.removeListener(this.onDisconnectHandler);
    this.port = null;
  }
  onWindowUnload() {
    this.port && this.port.disconnect();
    this.destroy();
  }
  onWindowMessage(event) {
    // We only accept messages from ourselves
    if (event.source !== window)
      return;
    const msg = event.data;
    if (!msg || typeof msg !== 'object') return;
    if (typeof msg.type !== 'string' || !msg.type.startsWith('HANSIGHT_UX_CS_')) return;
    console.log('receive window message', msg);    
    const funcName = msg.type.substring(15);
    if (typeof this[funcName] === 'function') {
      const args = Array.isArray(msg.data) ? msg.data : (msg.data ? [msg.data] : []);
      this[funcName].apply(this, args);
    }
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
  _postPortMessage(type, ...args) {
    const msg = { type: `HANSIGHT_UX_${type}` };
    msg.data = args;
    this.port && this.port.postMessage(msg)
  }
  _postWindowMessage(type, ...args) {
    const msg = { type: `HANSIGHT_UX_WP_${type}` };
    msg.data = args;
    window.postMessage(msg, '*');
  }
  onDisconnect() {
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError);
      setTimeout(createClient, 1000);
    }
  }
  activeTab() {
    this._postWindowMessage('activeTab');
  }
  startRecord(id, tag) {
    if (this.curRecord) {
      this.stopRecord();
    }
    this.curRecord = { id, tag };
    this._postPortMessage('startRecord', id, tag);
  }
  stopRecord(sessionId) {
    if (this.curRecord) {
      this._postPortMessage('stopRecord', this.curRecord.id);      
    }
    this.curRecord = null;
  }
}


let client = null; // singleton
function createClient() {
  if ((++clientTries) >= 100) return;
  if (client) {
    client.destroy();
  }
  client = new Client();
  console.log('create client');
}

createClient();
