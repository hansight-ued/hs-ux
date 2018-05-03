const LoginForm = require('../form/Login');
const UserForm = require('../form/User');
const UserSettingForm = require('../form/UserSetting');
const PasswordResetForm = require('../form/ResetPassword');
const User = require(__common + 'model/User');
const _ = require('lodash');
const {
  logger,
  verifyPassword,
  encodePassword
} = require(__framework);

async function session() {
  const user = await User.findOneById(this.user.id);
  await user.loadPrivileges();
  if (user) {
    this.success(_.omit(user, ['password']));    
  } else {
    this.error(500);
  }
}

async function test() {
  const Test = require(__common + 'model/Test');
  const t1 = new Test({ tb: 'kk' });
  logger.log(t1);
  await t1.save();

  const t2 = await Test.findOneById(t1.id, {
    where: {
      tb: 'kk',
      createTime: t1.createTime
    }
  });
  logger.log(t2);
  // if (t2) await t2.remove();
  // t2.tb = 'yes2';
  // await t2.save();
  this.success(t2);
}

async function login() {
  const form = await this.fillForm(LoginForm);
  const user = await User.findOne({
    username: form.username
  });
  if (!user || !(await verifyPassword(user.password, form.password))) {
    this.session = null;  // destroy previous
    return this.error(1001, 'error.login');
  }
  await user.loadPrivileges();
  this.session.userId = user.id;
  this.success(_.omit(user, ['password']));
}

async function register() {
  const user = new User(await this.fillForm(UserForm));
  user.password = await encodePassword(user.password);
  await user.save();
  this.success({ id: user.id });
}

async function logout() {
  this.session = null; // destroy session
  this.success(true);
}

async function updateUserSetting() {
  let user = await User.findOne({
    id: this.session.userId
  });

  const form = await this.fillForm(UserSettingForm);
  user = _.extend(user, form);
  await user.save();
  this.success({ id: user.id });
}

async function resetPassword() {
  const user = await User.findOne({ id: this.session.userId });
  const form = await this.fillForm(PasswordResetForm);

  if (!(await verifyPassword(user.password, form.oldPassword))) {
    return this.error(403, 'old password is wrong');
  }

  user.password = await encodePassword(form.newPassword);
  await user.save();
  this.session = null;
  this.success({ id: user.id });
}

module.exports = {
  login,
  logout,
  register,
  session,
  updateUserSetting,
  resetPassword,
  test
};
