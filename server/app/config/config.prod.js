const path = require('path');
const os = require('os');
const pkgName = require('../../package.json').name;

module.exports = {
  ux: {
    dataDir: '/opt/hansight/ux/videos',
    maxTasks: 10,
    maxTries: 3
  },
  log: {
    level: process.env['LOG_LEVEL'] || (process.env['SYNC_SCHEMA'] === 'true' ? 'debug' : 'info')
  },
  session: {
    type: 'redis'
  },
  db: {
    type: 'mysql',
    synchronize: process.env['SYNC_SCHEMA'] === 'true',
    mysql: {
      host: '127.0.0.1',
      port: 3306,
      username: 'root',
      password: 'hansight.com',
      database: 'hansight_ux'
    }
  },
  static: {
    // 生产模式下，默认不开启对静态文件的支持，统一由 nginx 处理静态文件
    enable: false
  }
};
