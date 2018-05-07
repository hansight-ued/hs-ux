const typeorm = require('typeorm');
const _ = require('lodash');
const _util = require('./util');
const path = require('path');
const fsps = require('fs/promises');
const {
  ObjectId
} = require('bson');
const logger = require('./logger');
const config = require('./config');
const EMPTY_OBJECT = {};
const NOT_INIT_ERR_MSG = 'Database has not been initialized';
const {
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryColumn,
  PrimaryGeneratedColumn,
  ObjectIdColumn,
  VersionColumn,
  DiscriminatorColumn,
  JoinTable,
  JoinColumn,
  ManyToOne,
  ManyToMany,
  OneToMany,
  OneToOne,
  Entity,
  AbstractEntity,
  ClosureEntity,
  EmbeddableEntity,
  SingleEntityChild,
  ClassEntityChild,
  Index
} = typeorm;

function objectId() {
  return new ObjectId().toString('hex');
}

function sqliteTypeMap(type) {
  switch (type) {
  case 'string':
  case 'varchar':
  case 'char':
  case 'text':
    return String;
  case 'int':
  case 'integer':
  case 'smallint':
  case 'bigint':
  case 'tinyint':
    return 'integer';
  case 'double':
  case 'float':
  case 'decimal':
  case 'real':
    return 'real';
  case 'timestamp':
  case 'date':
  case 'time':
    return Date;
  case 'boolean':
    return Boolean;
  case 'number':
    return Number;
  default:
    return type;
  }
}

function mysqlTypeMap(type) {
  switch (type) {
  case 'string':
  case 'varchar':
  case 'char':
    return String;
  case 'number':
    return Number;
  case 'boolean':
    return Boolean;
  case 'date':
  case 'time':
  case 'timestamp':
    return Date;
  default:
    return type;
  }
}

class DatabaseManager {
  constructor() {
    this._connection = null;
    this._config = null;
    this._entityManager = null;
  }
  get connection() {
    if (!this._connection) throw new Error(NOT_INIT_ERR_MSG);
    return this._connection;
  }
  get entityManager() {
    if (!this._entityManager) throw new Error(NOT_INIT_ERR_MSG);
    return this._entityManager;
  }
  _wrapRelation(_arr, cc) {
    let _m;
    if (cc.manyToMany) {
      _m = ManyToMany(...cc.manyToMany);
    } else if (cc.manyToOne) {
      _m = ManyToOne(...cc.manyToOne);
    } else if (cc.oneToMany) {
      _m = OneToMany(...cc.oneToMany);
    } else if (cc.oneToOne) {
      _m = OneToOne(...cc.oneToOne);
    } else {
      return false;
    }
    _arr.push(_m);
    if (_.isObject(cc.joinTable)) {
      _arr.push(JoinTable(cc.joinTable));
    } else if (cc.joinTable === true) {
      _arr.push(JoinTable());
    }
    if (_.isObject(cc.joinColumn)) {
      _arr.push(JoinColumn(cc));
    } else if (cc.joinColumn === true) {
      _arr.push(JoinColumn());
    }
    return true;
  }
  /**
   * columnDefines 可以是直接定义 typeorm 的 decorator:
   *   const { BaseModel, Column, Index, PrimaryColumn, ManyToMany } = require(__framework);
   *   class SomeModel extends BaseModel {
   *     static get columnDefines() {
   *       return {
   *          id: PrimaryColumn(),
   *          name: [Column({ type: 'string', nullable: false }), Index()],
   *          children: [ManyToMany(...)]
   *       }
   *     }
   *   }
   * 也可以是定义 object 的方式：
   *   const { BaseModel } = require(__framework);
   *   class SomeModel extends BaseModel {
   *     static get columnDefines() {
   *       return {
   *          id: 'id',
   *          name: {
   *            type: 'string',
   *            index: true
   *          },
   *          children: {
   *            manyToMany: [...]
   *          }
   *       }
   *     }
   *   }
   * @param ModelClass
   * @returns {*}
   */
  _wrapModel(ModelClass) {
    const columns = ModelClass.columnDefines;
    for (const pn in columns) {
      const cv = columns[pn];
      let dArr;
      if (Array.isArray(cv)) {
        dArr = cv;
        columns[pn] = {};
      } else if (_.isFunction(cv)) {
        dArr = [cv];
        columns[pn] = {};
      } else if (_.isString(cv)) {
        columns[pn] = {
          type: cv
        };
        dArr = [this._wrapColumn(columns[pn])];
      } else if (_.isObject(cv)) {
        dArr = [];
        if (!this._wrapRelation(dArr, cv)) {
          dArr.push(this._wrapColumn(cv));
          if (_.isObject(cv.index)) {
            dArr.push(Index(cv.index));
            delete cv.index;
          } else if (cv.index === true) {
            dArr.push(Index());
            delete cv.index;
          }
        }
      } else {
        throw new Error('columnDefine not validate');
      }
      _util.decorate(
        dArr,
        ModelClass.prototype,
        pn,
        void 0
      );
    }

    const ent = ModelClass.entityDefines;
    return _util.decorate(
      Array.isArray(ent) ? ent : [ent],
      ModelClass
    );
  }
  _wrapColumn(options) {
    if (_.isString(options)) {
      options = {
        type: options
      };
    } else if (!_.isObject(options)) {
      throw new Error('columnDefine not validate');
    }
    if (!options.type) options.type = 'string';
    if (_.isString(options.type)) options.type = options.type.toLowerCase();
    if (options.type === 'id') {
      options.primary = true;
    }
    if (options.type === 'objectid' || options.type === 'id') {
      options.type = 'string';
      options.length = 24;
      options.default = objectId;
    }
    const copyOptions = Object.assign({}, options);
    if (this._config.type === 'sqlite') {
      copyOptions.type = sqliteTypeMap(copyOptions.type);
    } else if (this._config.type === 'mysql') {
      copyOptions.type = mysqlTypeMap(copyOptions.type);
    } else {
      throw new Error(this._config.type + ' database type not support');
    }
    if (_.isFunction(copyOptions.default)) {
      delete copyOptions.default;
    }
    if (copyOptions.type === Date) {
      if (copyOptions.create && copyOptions.update) throw new Error('create and update can not both be true');
      if (options.update) {
        logger.warn('ON UPDATE CURRENT_TIMESTAMP is not supported.');
      }
      if (this._config.type === 'mysql') {
        copyOptions.type = 'bigint';
      }
      options.default = () => Date.now();
      return Column(copyOptions);
    } else {
      return Column(copyOptions);
    }
  }
  async initialize() {
    if (this._connection) return;
    this._config = Object.assign({
      type: config.db.type,
      synchronize: !!config.db.synchronize,
    }, config.db[config.db.type]);

    const models = [];
    /*
     * 扫描并加载公共 models
     */
    const commonDir = path.join(__common, 'model');
    if (await _util.exists(commonDir)) {
      await _util.loopRequire(commonDir, models);
    }
    /**
     * 扫描并加载各个子模块的 models
     */
    const moduleDir = path.join(__root, 'module');

    const subModules = await fsps.readdir(moduleDir);

    for (let i = 0; i < subModules.length; i++) {
      const modelDir = path.join(moduleDir, subModules[i], 'model');
      if (await _util.exists(modelDir)) {
        await _util.loopRequire(modelDir, models);
      }
    }
    models.forEach(Model => this._wrapModel(Model));
    logger.debug(`${models.length} models loaded`);

    this._connection = await typeorm.createConnection(Object.assign({
      entities: models,
      logging: true,
      logger: {
        logQuery(query, params) {
          logger.debug(query, params || '');
        },
        logQueryError(message, query, params) {
          logger.error(message, query, params || '');
        },
        logQuerySlow(time, query, params) {
          logger.warn('SLOW QUERY', time, query, params || '');
        },
        logSchemaBuild(message) {
          logger.debug(message);
        },
        log: function (level, message) {
          logger.debug('TYPEORM LOG [', level, ']', message);
        }
      }
    }, this._config));
    this._entityManager = this._connection.manager;
    models.forEach(m => {
      m.__repo = this._entityManager.getRepository(m);
    });
  }
  transaction(...args) {
    return this.entityManager.transaction(...args);
  }
  save(...args) {
    return this.entityManager.save(...args);
  }
  remove(...args) {
    return this.entityManager.remove(...args);
  }
}

/* singleton */
const db = new DatabaseManager();

class BaseModel {
  static get entityDefines() {
    // 默认为 @Entity()
    // 可以通过此属性手动指定 entity,
    // 比如 @Entity(name, options) 或 @EmbeddableEntity() 等
    return [typeorm.Entity()];
  }
  static get columnDefines() {
    throw new Error('abstract method');
  }
  static get repository() {
    if (!this.__repo) {
      throw new Error(NOT_INIT_ERR_MSG);
    }
    return this.__repo;
  }
  static createQueryBuilder(alias) {
    return this.repository.createQueryBuilder(alias || this.name.replace(/[a-z][A-Z]/g, m => m[0] + '_' + m[1]).toLowerCase());
  }
  static count(options) {
    return this.repository.count(options);
  }
  static findByIds(ids, options) {
    return this.repository.findByIds(ids, options);
  }
  static findOneById(id, options) {
    return this.repository.findOne(id, options);
  }
  static find(options) {
    return this.repository.find(options);
  }
  static findOne(options) {
    return this.repository.findOne(options);
  }
  static findAndCount(options) {
    return this.repository.findAndCount(options);
  }
  static async removeById(id, options) {
    try {
      await this.repository.removeById(id, options);
      return true;
    } catch (ex) {
      return false;
    }
  }

  /*
   * const m = new Model();  // 不赋予字段默认值，这是 typeorm 内部实例化 entity 时的方式
   * const m = new Model({}); // 赋予字段默认值，这是通常情况下业务层代码实例化 model 的方式
   * const m = new Model(true); // 赋予字段默认值
   * const m = new Model({}, false);  // 不赋予字段默认值
   */
  constructor(obj, assignDefaultValue) {
    if (!_.isObject(obj)) {
      assignDefaultValue = !!obj;
      obj = EMPTY_OBJECT;
    } else {
      assignDefaultValue = assignDefaultValue !== false;
    }
    const columnDefines = this.constructor.columnDefines;
    for (const pn in columnDefines) {
      const cd = columnDefines[pn];
      if (obj.hasOwnProperty(pn)) {
        this[pn] = obj[pn];
      } else if (assignDefaultValue && cd.hasOwnProperty('default')) {
        const dv = cd['default'];
        if (_.isFunction(dv)) {
          this[pn] = dv();
        } else {
          this[pn] = dv;
        }
      }
    }
  }
  save(db) {
    return db ? db.save(this) : this.constructor.repository.save(this);
  }
  remove(db) {
    return db ? db.remove(this) : this.constructor.repository.remove(this);
  }
}

const BASE_USER_COLUMN_DEFINES = {
  id: 'id',
  username: {
    type: 'string',
    unique: true
  },
  nickname: {
    type: 'string',
    default: ''
  }
};

class BaseUserModel extends BaseModel {
  static get columnDefines() {
    return BASE_USER_COLUMN_DEFINES;
  }
  constructor(obj) {
    super(obj);
    this.privileges = null;
  }
  async loadPrivileges() {
    throw new Error('abstract method must be implement');
  }
  _hasPrivilege(privilege) {
    if (_.isFunction(privilege)) {
      return _.findIndex(this.privileges, m => privilege(m)) >= 0;
    } else if (privilege instanceof RegExp) {
      return _.findIndex(this.privileges, m => privilege.test(m)) >= 0;
    } else if (privilege.endsWith('.*')) {
      privilege = privilege.substring(0, privilege.length - 1);
      return _.findIndex(this.privileges, m => m.startsWith(privilege)) >= 0;
    } else {
      return this.privileges.indexOf(privilege) >= 0;
    }
  }

  /*
   * 鉴定是否满足全部权限。
   * 参数为待检测的权限数组，数组每一个元素是一个权限；
   *   数组的元素也可以是一个数组，
   *   代表该子数组需要满足至少一个权限。
   */
  async hasAllPrivileges(privileges) {
    if (!Array.isArray(privileges)) {
      throw new Error('User.hasAllPrivileges need Array type argument');
    }
    await this.loadPrivileges();
    for (let i = 0; i < privileges.length; i++) {
      const priv = privileges[i];
      if (Array.isArray(priv)) {
        if (!(await this.hasAnyPrivilege(priv))) {
          return false;
        }
      } else if (!this._hasPrivilege(priv)) {
        return false;
      }
    }
    return true;
  }
  /*
   * 鉴定是否满足至少一个权限。
   * 参数为待检测的权限数组，数组每一个元素是一个权限；
   *   数组的元素也可以是一个数组，
   *   代表该子数组需要满足全部权限。
   */
  async hasAnyPrivilege(privileges) {
    if (!Array.isArray(privileges)) {
      throw new Error('User.hasAnyPrivilege need Array type argument');
    }
    await this.loadPrivileges();
    for (let i = 0; i < privileges.length; i++) {
      const priv = privileges[i];
      if (Array.isArray(priv)) {
        if (await this.hasAllPrivileges(priv)) {
          return true;
        }
      } else if (this._hasPrivilege(priv)) {
        return true;
      }
    }
    return false;
  }
  /*
   * 参数可以是一个权限 id 的字符串
   * 参数也可以是末尾是带 * 的模糊匹配字符串，
   *   用来表示以该字符串打头的任何权限，
   *   注意 * 只能放在末尾，如果需要其它类型模糊匹配，
   *   使用正则表达式
   * 参数可以是正则表达式，用于模糊匹配，
   *   请务必注意不要忽略了正则表达式的 ^ 和 $
   * 参数还可以是一个函数，用于动态判断
   *
   * @example
   *
   *
   * let hasPrivilege = await this.user.hasAllPrivileges([
   *   'p1', 'p2',
   *   ['p3', 'p4'],
   *   /^bi\.\w+\.modify$/
   *   'manage.user.*',
   *   t => /^user\.\w+\.read/.test(t)
   * ]);
   *
   * if (!hasPrivilege) return this.error(403);
   *
   * 以上示例代表在 controller 的逻辑里，要求验证用户权限：
   *   同时拥有 p1, p2 权限，
   *   并且至少拥有 p3 或 p4 权限
   *   并且拥有至少一个符合正则表达式 /^bi\.\w+\.modify$/ 的权限
   *   并且拥有以 manage.user. 打头的任何一个权限
   *   并且拥有至少一个满足 /^user\.\w+\.read/ 的权限
   */
  async hasPrivilege(privilege) {
    await this.loadPrivileges();
    return this._hasPrivilege(privilege);
  }
}


module.exports = {
  BaseModel,
  BaseUserModel,
  objectId,
  manager: db,
  Column,
  ManyToMany,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryColumn,
  ObjectIdColumn,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  VersionColumn,
  DiscriminatorColumn,
  Entity,
  JoinTable,
  JoinColumn,
  AbstractEntity,
  EmbeddableEntity,
  ClassEntityChild,
  SingleEntityChild,
  ClosureEntity,
  Index
};