const { BaseModel } = require(__framework);

const COLUMN_DEFINES = {
  id: {
    type: 'string',
    primary: true,
    length: 512
  },
  name: 'string',
  description: {
    type: 'string',
    length: 1024,
    nullable: true
  },
  users: {
    manyToMany: [type => require('./User'), user => user.roles]
  },
  privileges: {
    manyToMany: [type => require('./Privilege'), privilege => privilege.roles],
    joinTable: true
  }
};

class Role extends BaseModel {
  static get columnDefines() {
    return COLUMN_DEFINES;
  }
}

module.exports = Role;
