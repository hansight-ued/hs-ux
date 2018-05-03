const logger = require('./logger');
const config = require('./config');

let client = null;
async function getRedisClient() {
  if (client) return client; // singleton
  client = require('redis').createClient(config.redis);
  client.on('error', err => {
    logger.error(err);
  });
  /*
   * 由于 node-redis 库没有主动检查连接的方式，
   * 这里采取执行一次 get 命令来检查 redis 状态
   */
  await new Promise((resolve, reject) => {
    client.get('______', err => {
      if (err) {
        logger.error('redis connect failed');
        reject(err);
      } else {
        logger.info('redis connected');
        resolve();
      }
    });
  });
  return client;
}

module.exports = {
  getRedisClient
};
