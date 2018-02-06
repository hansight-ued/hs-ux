
/*
 * 注册为全局变量，方便业务逻辑 require
 * 请不要修改此处的变量注册
 */
const path = require('path');
global.__root = __dirname + '/';
global.__framework = path.join(__dirname, 'framework/');
global.__common = path.join(__dirname, 'common/');
global.__module = path.join(__dirname, 'module/');
/*
 * 
 */
const { bootstrap } = require('./framework');

bootstrap({
  beforeStart: async function(app) {
    /*
     * 如果 SYNC_SCHEMA === 'true' 说明运行的是 npm run db:sync 命令
     * 同步数据库后退出
     */
    if (process.env['SYNC_SCHEMA'] === 'true') {
      /*
       * 必须在函数内而不是文件头部 require
       * 因为框架需要进行数据库相关初始化。
       */
      await require('./init_data')(app);
      app.logger.info('finish sync, process exit.');
      process.exit(0);
    }
    /*
     * 通过检测是否存在 admin 用户来粗略地保障数据库已经初始化。
     * 这个方法只适用于初始化，但如果是数据库发生了变更，需要手动执行 migrate
     */
    const adminUser = await require('./common/model/User').findOne({
      username: app.config.admin.username
    });
    // throw new Error('tttt')
    if (adminUser) {
      return;
    }
    if (process.env['NODE_ENV'] !== 'production') {
      /*
       * 必须在函数内而不是文件头部 require
       * 因为框架需要进行数据库相关初始化。
       */
      await require('./init_data')(app);
    } else {
      throw new Error('Admin user not found, you may sync schema and data first. Try run `npm run db:sync`');
    }
  },
  onError(err) {
    if (process.env['NODE_ENV'] === 'development'
      || process.env['SYNC_SCHEMA'] === 'true') {
      process.exit(-1);
    }
  }
});
