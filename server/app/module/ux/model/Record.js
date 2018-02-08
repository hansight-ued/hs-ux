const { 
  BaseModel,
  Index,
  Entity
} = require(__framework);

const ENTITY_DEFINES = [
  Entity()
];
const COLUMN_DEFINES = {
  id: 'id',
  startTime: {
    type: 'time',
    create: true
  },
  endTime: {
    type: 'time',
    nullable: true
  },
  tag: {
    type: 'string',
    length: 500
  },
  mimeType: 'string'
};

class UxRecord extends BaseModel {
  static get entityDefines() {
    return ENTITY_DEFINES;
  }
  static get columnDefines() {
    return COLUMN_DEFINES;
  }
}

module.exports = UxRecord;
