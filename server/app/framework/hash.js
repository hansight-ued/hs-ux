const crypto = require('crypto');
const _util = require('./util');

const pbkdf2 = _util.wrapPromise(crypto.pbkdf2);
const randomBytes = _util.wrapPromise(crypto.randomBytes);

async function tryPbkdf2(password, salt) {
  const maxTries = 3;
  let i = 0;
  while(i >= 0) {
    try {
      return (await pbkdf2(password, salt, 100000, 128, 'sha512')).toString('hex').substring(0, 256);
    } catch(ex) {
      i++;
      if (i === maxTries) {
        throw ex;
      }
    }
  }
}

async function tryRandom() {
  const maxTries = 3;
  let i = 0;
  while(i >= 0) {
    try {
      return (await randomBytes(128)).toString('hex');
    } catch(ex) {
      i++;
      if (i === maxTries) {
        throw ex;
      }
    }
  }
}
class Hash {
  constructor(app, config) {
    this._app = app;
    this.logger = app.logger;
  }
  /*
   * 如果 isBrowser 为 true，则需要进行和浏览器上一致的逻辑
   * 在浏览器上，会对密码进行 revert 后再 sha512 加密，然后 hex 取前 256 位。
   */
  async encodePassword(password, isBrowser = false) {
    if (isBrowser) {
      const arr = password.split('');
      const i = arr.map(c => c.charCodeAt(0)).reduce((p, n) => p + n, 0) % arr.length;
      password = arr.slice(0, i).reverse().concat(arr.slice(i).reverse()).join('');
      password = crypto.createHash('sha512').update(password).digest('hex').substring(0, 256);
      this.logger.debug('gen browser password', password);
    }
    const salt = await tryRandom();
    const hash = await tryPbkdf2(password, salt);
    return salt + hash;
  }

  async verifyPassword(password, password2) {
    if (!password || password.length !== 512) return false;
    const salt = password.substring(0, 256);
    const hash = password.substring(256);
    const hash2 = await tryPbkdf2(password2, salt);
    return hash === hash2;
  }

}
 
module.exports = {
  Hash
};
