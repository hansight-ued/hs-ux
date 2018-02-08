const path = require('path');

module.exports = {
  app: {
    title: 'Hansight Enterprise',
    secretKey: 'jkldiw483749%#&%!&c',
  },
  form: {
    maxBody: '50kb'
  },
  ux: {
    dataDir: path.resolve(__root, '../run/data')
  },
  log: {
    path: path.resolve(__root, '../run/logs'),
    level: 'debug',
    access: true
  },
  /* 配置系统管理员账户密码 */
  admin: {
    username: 'admin',
    // Rv3k/y6G1eZpg/35IkqHQiEviGdukQirkJdMVzxIwlha5SqxuUwF+UbSIjzsUe0f4J3Ci60JAMcXwAp5t2tq4Q==
    password: 'admin',
    theme: 'black'
  },
  /* 配置系统初始化时需要添加的用户 */
  users: [{
    username: 'hansight',
    // kqz99kq6+1WFM5GAs9Wgxgga1idNQoxUr7HFDOqjC5AdJUVPiUxCfBGDNAx/hN4vAO0FmIG4TVH90eq0cGaYxg==
    password: 'S3cur!ty',
    theme: 'black',
    roles: ['user', 'bi_user']
  }],
  static: {
    path: null
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
