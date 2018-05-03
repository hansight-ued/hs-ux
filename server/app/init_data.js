const path = require('path');
const _ = require('lodash');
const User = require(__common + 'model/User');
const Role = require(__common + 'model/Role');
const Privilege = require(__common + 'model/Privilege');
const {
  util,
  logger,
  config,
  encodePassword,
  database
} = require(__framework);

async function initRolesAndPrivileges(app) {

  let privileges = [];
  let roles = [];
  (await util.readdir(__module)).forEach(mn => {
    let rp;
    const file = path.join(__module, mn, 'role_privilege.js');
    try {
      rp = require(file);
    } catch(ex) {
      logger.warn('[load role privilege]', file, 'not found or invalidate, ignore');
      return;
    }
    privileges = privileges.concat(rp.privileges);
    roles = roles.concat(rp.roles);
  });
  privileges = privileges.map(p => {
    if (!/^[a-z]+(?:\.[a-z]+)*$/.test(p.id)) {
      throw new Error(`id of privilege must match /^[a-z]+(\\.[a-z]+)*$/, but got "${p.id}"`);
    }
    return new Privilege(p);
  });
  roles = roles.map(r => {
    if (!/^[a-z_]+$/.test(r.id)) {
      throw new Error(`id of role must match /^[a-z_]+$/, but got "${r.id}"`);
    }
    r.privileges = r.privileges.reduce((pArr, pId) => {
      let nArr;
      if (pId.endsWith('.*')) {
        pId = pId.substring(0, pId.length - 1);
        nArr = privileges.filter(pp => pp.id.startsWith(pId));
      } else {
        nArr = [_.find(privileges, pp => pp.id === pId)].filter(pp => !!pp);
      }
      if (!nArr || nArr.length === 0) {
        throw new Error(`role "${r.id}" has no privilege match`);
      }
      return pArr.concat(nArr);
    }, []);
    return new Role(r);
  });

  await database.transaction(async db => {
    await db.save(privileges);
    await db.save(roles);
  });

  return {
    privileges,
    roles
  };
}

async function initUsers(rp) {
  const admin = config.initialize.admin;
  admin.roles = rp.roles;
  const users = [admin].concat((config.initialize.users || []).map(u => {
    u.roles = u.roles.map(r => _.find(rp.roles, rm => rm.id === r)).filter(r => !!r);
    return u;
  }));
  const existUsers = await User
    .createQueryBuilder()
    .where('username in (:username)', {
      username: users.map(u => u.username)
    }).getMany();

  for(let i = 0; i < users.length; i++) {
    const u = _.find(existUsers, eu => eu.username === users[i].username) || new User(users[i]);
    if (!u.password && !users[i].password) {
      users[i].password = util.generatePassword();
      logger.info('Generate new password for', users[i].username, ' ==> ', users[i].password);
    }
    if (!u.password) {
      u.password = await encodePassword(users[i].password, true);      
    }
    users[i] = u;
  }
  await database.save(users);

}

async function initData(app) {
  const rp = await initRolesAndPrivileges();
  await initUsers(rp);
}

module.exports = initData;
