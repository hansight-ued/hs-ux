const path = require('path');
const fs = require('fs');
const uglify = require('uglify-es');
const exec = require('child_process').execSync;
const _util = require('../app/framework/util');
const CWD = process.cwd();
const config = require('./_config.default');
const BUILD_APP = process.env['BUILD_APP'] || 'bi';
const appModule = config.appModule;

const writeFile = _util.wrapPromise(fs.writeFile);
const exec2 = _util.wrapPromise(require('child_process').exec);

function _scan(dir, out = []) {
  fs.readdirSync(dir).forEach(sub => {
    let fi = path.join(dir, sub);
    let st = fs.statSync(fi);
    if (st.isDirectory()) {
      _scan(fi, out);
    } else if (/\.js$/.test(fi)) {
      out.push(fi);
    }
  });
  return out;
}
function _exit(err) {
  err && console.error(err);
  process.exit(0);
}

if (!appModule.hasOwnProperty(BUILD_APP)) {
  _exit(`Unknown app name ${BUILD_APP}`);
}

const tmpDir = path.join(CWD, '.tmp');
const distDir = path.join(CWD, 'dist');
const appRootDir = path.join(CWD, 'app');

// clean & mkdir
exec(`rm -rf ${distDir}`);
exec(`rm -rf ${tmpDir}`);
exec(`mkdir -p ${distDir}`);
exec(`mkdir -p ${tmpDir}/config/proxy_rules`);
exec(`mkdir -p ${tmpDir}/module`);

console.log('Copy files...');
// 拷贝配置文件
['config.default.js', 'config.prod.js'].forEach(f => {
  exec(`cp -rf ${path.join(appRootDir, 'config', f)} ${path.join(tmpDir, 'config')}`);
});
// 拷贝 proxy_rules
exec(`cp ${path.join(appRootDir, `config/proxy_rules/${BUILD_APP}.js`)} ${path.join(tmpDir, 'config/proxy_rules')}`);

// 拷贝公共模块
['common', 'framework', 'index.js', 'init_data.js'].forEach(f => {
  exec(`cp -rf ${path.join(appRootDir, f)} ${tmpDir}`);
});
// 拷贝应用模块
appModule[BUILD_APP].forEach(m => {
  exec(`cp -rf ${path.join(appRootDir, 'module', m)} ${path.join(tmpDir, 'module')}`);
});

// 添加必要的 package.json 文件
fs.writeFileSync(path.join(distDir, 'package.json'), JSON.stringify({
  name: BUILD_APP
}));

console.log('Uglify compressing...');
/*
 * 为加快速度，按 20 个文件一个分组，
 * 分组内文件并发压缩
 */
(function () {
  const all = _scan(tmpDir);
  const groups = [];
  while(all.length > 0) {
    groups.push(all.splice(0, 20));
  }
  return groups;
})().reduce((p, n) => {
  return p.then(() => Promise.all(n.map(file => {
    return (async () => {
      const cnt = await _util.readFile(file, 'utf-8');
      const result = process.env['NO_COMPRESS'] ? {
        code: cnt
      } : uglify.minify(cnt);
      if (result.error) {
        throw result.error;
      }
      const df = path.join(distDir, 'app', path.relative(tmpDir, file));
      await exec2(`mkdir -p ${path.dirname(df)}`);
      await writeFile(df, result.code);
    })();
  })));
}, Promise.resolve()).then(() => {
  exec(`rm -rf ${tmpDir}`);
  console.log('Build finish.');
}).catch(_exit);