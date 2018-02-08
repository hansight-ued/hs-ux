const path = require('path');
module.exports = {
  app: {
    secretKey: process.env['SECRET_KEY'] || 'h3i2n&#2s@i9cs*&dg2h^dml2t/}{c0x8(w)251&^*i<w>|/',
  },
  ux: {
    dataDir: process.env['UX_DATA_DIR'] || '/opt/hansight/ux/data'
  },
  log: {
    path: process.env['LOG_PATH'] || '/var/log/hansight',
    level: process.env['LOG_LEVEL'] || (process.env['SYNC_SCHEMA'] === 'true' ? 'debug' : 'info')
  },
  session: {
    type: 'redis'
  },
  db: {
    type: 'mysql',
    synchronize: process.env['SYNC_SCHEMA'] === 'true',
    sqlite: {
      database: '/opt/hansight/db'
    },
    mysql: {
      host: '127.0.0.1',
      port: 3306,
      username: 'root',
      password: 'hansight.com',
      database: 'hansight_ux'
    }
  },
  router: {
    prefix: '__api'
  },
  static: {
    prefix: '__public',
    path: path.resolve(__root, '../../client')
  },
  proxy: {
    remotes: {}
  },
  admin: {
    password: process.env['ADMIN_PASSWORD'] || 'x&*d2^!2dx{]|0c.w[lkw'
  }
};
