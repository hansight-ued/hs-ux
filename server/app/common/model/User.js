const {
  BaseUserModel
} = require(__framework);
const _ = require('lodash');
const Role = require('./Role');
const Privilege = require('./Privilege');

const COLUMN_DEFINES = Object.assign(BaseUserModel.columnDefines, {
  nickname: {
    type: 'string',
    default: ''
  },
  password: {
    type: 'string',
    length: 512
  },
  locale: {
    type: 'string',
    nullable: true
  },
  theme: {
    type: 'string',
    default: 'black'
  },
  roles: {
    manyToMany: [type => require('./Role'), role => role.users],
    joinTable: true
  }
});

class User extends BaseUserModel {
  static get columnDefines() {
    return COLUMN_DEFINES;
  }
  async loadPrivileges() {
    if (!this.privileges) {
      const qb = this.constructor.entityManager;
      // 此处三表联查很复杂，直接使用原始的 sql query
      const ps = await qb.query(`
SELECT
    \`privilege\`.id
FROM
    \`user\`,
    \`role\`,
    \`privilege\`,
    \`user_roles_role\`,
    \`role_privileges_privilege\`
WHERE
      \`user\`.id = \`user_roles_role\`.\`userId\` 
  AND \`role\`.id = \`user_roles_role\`.\`roleId\`
  AND \`role\`.id = \`role_privileges_privilege\`.\`roleId\`
  AND \`privilege\`.id = \`role_privileges_privilege\`.\`privilegeId\`
  AND \`user\`.id = "${this.id}"
ORDER BY
    \`privilege\`.id
DESC
`);
      this.privileges = ps.map(p => p.id);
    }
    return this.privileges;
  }
  /**
   * 返回不涉及敏感的必要信息。
   */
  pickInfo() {
    return _.pick(this, 'id', 'username', 'nickname');
  }
}

module.exports = User;
