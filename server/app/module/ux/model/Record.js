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
    nullable: true 
  },
  endTime: {
    type: 'time',
    nullable: true
  },
  lastUpdateTime: {
    type: 'time',
    nullable: true
  },
  tag: {
    type: 'string',
    length: 500
  },
  state: {
    type: 'tinyint',
    index: true
  },
  mimeType: 'string'
};

class UxRecord extends BaseModel {
  static get STATES() {
    return {
      ERROR: 0,
      RECORDING: 10,
      WAITING: 20,
      CONVERTING: 30,
      FINISHED: 100
    };
  }
  static get entityDefines() {
    return ENTITY_DEFINES;
  }
  static get columnDefines() {
    return COLUMN_DEFINES;
  }
}

module.exports = UxRecord;
