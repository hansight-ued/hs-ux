const path = require('path');

module.exports = {
  server: {
    port: 8081,
    host: '0.0.0.0'
  },
  static: {
    path: path.resolve(__dirname, '../../../client/dist')
  },
  session: {
    type: 'redis',
    // 只在开发模式下使用的，用于临时关闭用户会话控制的开关
    // 当 DEBUG_SKIP 不为空时，默认使用 DEBUG_SKIP 指定的账户登录
    DEBUG_SKIP: process.env['DEBUG_SKIP_SESSION'],
    maxAge: 24 * 60 * 60 * 1000,
    expire: 24 * 60 * 60 * 1000
  },
  redis: {
    host: '172.16.150.29'
  },
  db: {
    type: 'mysql',
    mysql: {
      host: "172.16.150.29",
      username: "root",
      password: "hansight.com",
      database: "hansight_ux"
    }
  }
};
