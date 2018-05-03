const privileges = [{
  name: '查看用户列表',
  id: 'manage.user.read.all',
}, {
  name: '查看用户信息',
  id: 'manage.user.read.info'
}, {
  name: '查看用户角色',
  id: 'manage.user.read.role'
}, {
  name: '添加用户',
  id: 'manage.user.add'
}, {
  name: '删除用户',
  id: 'manage.user.del'
}, {
  name: '修改用户信息',
  id: 'manage.user.modify.info'
}, {
  name: '修改用户角色',
  id: 'manage.user.modify.role'
}, {
  name: '修改用户密码',
  id: 'manage.user.modify.password'
}, {
  name: '查看角色列表',
  id: 'manage.role.read.all'
}, {
  name: '查看角色权限',
  id: 'manage.role.read.privilege'
}, {
  name: '添加角色',
  id: 'manage.role.add'
}, {
  name: '删除角色',
  id: 'manage.role.del'
}, {
  name: '修改角色权限',
  id: 'manage.role.modify.privilege'
}, {
  name: '查看所有权限',
  id: 'manage.privilege.read.all'
}, {
  name: '添加权限',
  id: 'manage.privilege.add'
}, {
  name: '删除权限',
  id: 'manage.privilege.del'
}, {
  name: '查看个人信息',
  id: 'user.read.info'
}, {
  name: '修改个人信息',
  id: 'user.modify.info'
}, {
  name: '修改个人密码',
  id: 'user.modify.password'
}];

const roles = [{
  name: '权限管理员',
  id: 'privilege_admin',
  description: '权限管理员可以查看、添加、删除或修改权限',
  privileges: ['manage.privilege.*']
}, {
  name: '角色管理员',
  id: 'role_admin',
  description: '角色管理员可以查看、添加、删除角色，以及修改角色权限',
  privileges: ['manage.role.*']
}, {
  name: '用户管理员',
  description: '用户管理员可以查看所有用户、添加或删除用户、修改用户信息和用户密码',
  id: 'user_admin',
  privileges: ['manage.user.*']
}, {
  name: '普通用户',
  id: 'user',
  description: '普通用户可以查看个人信息、修改个人信息和密码',
  privileges: ['user.*']
}];

module.exports = {
  privileges,
  roles
};
