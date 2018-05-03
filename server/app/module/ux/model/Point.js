const { 
  BaseModel,
  Index,
  Entity
} = require(__framework);

const MOUSE_TYPES = {
  MOVE: 10,
  DOWN: 20,
  UP: 30,
  CLICK: 40
};
const ENTITY_DEFINES = [
  Entity()
];
const COLUMN_DEFINES = {
  id: 'id',
  record: {
    manyToOne: [type => require('./Record'), record => record.points, {
      onDelete: 'CASCADE',
      nullable: false
    }]
  },
  type: {
    type: 'tinyint',
    default: MOUSE_TYPES.MOVE
  },
  ts: 'int',
  x: 'int',
  y: 'int',
  w: 'int',
  h: 'int'
};

class UxPoint extends BaseModel {
  static get MOUSE_TYPES() {
    return MOUSE_TYPES;
  }
  static get entityDefines() {
    return ENTITY_DEFINES;
  }
  static get columnDefines() {
    return COLUMN_DEFINES;
  }
}

module.exports = UxPoint;
