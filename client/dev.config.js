/* eslint-env node */
const path = require('path');
const pEnv = process.env;
const port = Number(process.env['PORT'] || '8080');

module.exports = {
  pkgName: require('./package.json').name,
  loadDemoModule: pEnv.hasOwnProperty('LOAD_DEMO_MODULE'),
  root: __dirname,
  env: {
    UX_ENABLED: false
  },
  server: { 
    port
  },
  mock: {
    dir: path.join(__dirname, 'mock'),
    rules: [ {
      prefix: '/',
      cut: false,
      enable: true
    } ]
  },
  libs: [
    /** 
     * 此处添加企业版依赖的第三方库
     * 在添加前请务必在开发群里提出，
     * 由大家共同讨论第三方库应该放在 entry 里，
     * 还是放在此处
     */
  ],
  ngDeps: [
    /**
     * 当 libs 里面添加了第三方库，需要在 angular 
     * 的模块依赖中也对应添加时，在此处添加
     */
  ],
  rollupExternal: [
    /* 此处添加内容前请保证完全理解，并在开发群中提出和讨论 */
  ],
  rollupGlobals: {
    /* 此处添加内容前请保证完全理解，并在开发群中提出和讨论 */
  },
  rollupAlias: {
    /* 此处添加内容前请保证完全理解，并在开发群中提出和讨论 */
  }
};
