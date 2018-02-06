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
  roles: {
    manyToMany: [type => require('./Role'), role => role.privileges]
  }
};

class Privilege extends BaseModel {
  static get columnDefines() {
    return COLUMN_DEFINES;
  }
}

module.exports = Privilege;
