const path = require('path');

module.exports = {
  form: {
    maxBody: '50kb'
  },
  ux: {
    enable: true,
    // 录屏数据存放位置    
    dataDir: path.resolve(__root, '../run/videos'),
    // maxTasks: 使用 ffmpeg 转 webm 到 mp4 的最大并发任务数
    maxTasks: 2,
    // maxTries：最大重试次数
    maxTries: 1
  },
  log: {
    level: 'debug',
    access: true
  },
  /* 系统初始化相关配置 */
  initialize: {
    /* 配置系统管理员账户信息 */
    admin: {
      username: 'admin',
      nickname: '管理员',
      theme: 'black'
    },
    /* 配置系统初始化时需要添加的用户 */
    users: [{
      username: 'xiaoge',
      nickname: '小葛',
      theme: 'black',
      roles: ['user']
    }]
  },
  static: {
    enable: true,
    prefix: '__public',
    path: path.resolve(__dirname, '../../../client')
  },
  session: {
    // 优先从 env.SESSION_TYPE 中取，方便灵活调试
    type: process.env['SESSION_TYPE'] || 'db', // 'db', 'redis'
    maxAge: 'session',     // 浏览器 session cookie 过期时间
    expire: 10 * 60 * 1000 // 服务器端 session 过期时间
  },
  redis: {
    host: '127.0.0.1',
    port: 6379
  },
  db: {
    // 优先从 env.DB_TYPE 中取，方便灵活调试
    type: process.env['DB_TYPE'] || 'sqlite', // 'mysql', 'sqlite'
    synchronize: process.env['DB_SYNC'] !== 'false',
    sqlite: {
      database: path.resolve(__root, '../run/db'),
    },
    mysql: {
      host: '127.0.0.1',
      port: 3306,
      username: '',
      password: '',
      database: ''
    }
  },
  router: {
    prefix: '__api'
  },
  server: {
    root: process.env['SERVER_ROOT'] || '/',  // 当配置为 nginx 反向代理时，需要修改 server.root
    port: process.env['PORT'] || 80,
    host: process.env['HOST'] || '127.0.0.1'
  }
};
