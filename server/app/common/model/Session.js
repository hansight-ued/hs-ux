const _ = require('lodash');
const { 
  BaseModel
} = require(__framework);

const COLUMN_DEFINES = {
  key: {
    type: 'string',
    primary: true
  },
  userId: {
    type: 'objectId'
  },
  expire: {
    type: 'timestamp'
  }
};

class Session extends BaseModel {
  static get columnDefines() {
    return COLUMN_DEFINES;
  }
  static getRedis(key, redis) {
    return new Promise((resolve, reject) => {
      redis.get(key, (err, result) => {
        if (err) return reject(err);
        if (!result) return resolve(null);
        try {
          const s = JSON.parse(result);
          if (!_.isObject(s) || !s.userId) {
            return resolve(null);
          }
          return resolve(s);
        } catch(ex) {
          return resolve(null);
        }
      });
    });
  }
  static setRedis(key, sess, expire, redis) {
    return new Promise((resolve, reject) => {
      if (!sess || !sess.userId) return resolve();
      redis.psetex(key, expire, JSON.stringify({
        userId: sess.userId
      }), err => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
  static destroyRedis(key, redis) {
    return new Promise((resolve, reject) => {
      redis.del(key, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
  static destroy(key) {
    return this.removeById(key);
  }
  static async get(key) {
    const s = await this.findOneById(key);
    if (!s || s.expire.getTime() < Date.now()) {
      return null;
    }
    return s;
  }
  static async set(key, sess, expire) {
    let s = await this.findOneById(key);
    if (!_.isObject(sess) || !sess.userId) {
      return;
    }
    expire = new Date(Date.now() + expire);
    if (!s) {
      s = new this({
        key,
        userId: sess.userId,
        expire
      });
    } else {
      s.expire = expire;
    }
    await s.save();
  }
}

module.exports = Session;
