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
  sessionId: 'objectId',
  recordId: 'objectId',
  mimeType: 'tinyint',
  blob: 'mediumblob'
};

class Record extends BaseModel {
  static get MIME_TYPES() {
    return {
      'video/webm': 0,
      'video/mp4': 1
    };
  }
  static get entityDefines() {
    return ENTITY_DEFINES;
  }
  static get columnDefines() {
    return COLUMN_DEFINES;
  }
}

module.exports = Record;
