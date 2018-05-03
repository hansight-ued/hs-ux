const bootstrap = require('./boot');
const { Router } = require('./router');
const { BaseForm, Joi } = require('./form');
const logger = require('./logger');
const { extendContext } = require('./context');
const util = require('./util');
const { authorizeMiddleware } = require('./session');
const config = require('./config');
const { encodePassword, verifyPassword } = require('./hash');

const { 
  BaseModel,
  BaseUserModel,
  objectId,
  manager,
  Column, 
  PrimaryColumn,
  PrimaryGeneratedColumn,
  PrimaryObjectIdColumn,
  UpdateDateColumn,
  CreateDateColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  OneToOne,
  Index,
  Entity,
  getConnection
} = require('./db');

const framework = {
  util,
  bootstrap,
  Router,
  logger,
  config,
  database: manager,
  encodePassword,
  verifyPassword,
  extendContext,
  authorize: authorizeMiddleware,
  privilege: authorizeMiddleware,
  BaseForm,
  Joi,
  BaseModel,
  BaseUserModel,
  objectId,
  Column, 
  PrimaryColumn,
  PrimaryGeneratedColumn,
  PrimaryObjectIdColumn,
  UpdateDateColumn,
  CreateDateColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  OneToOne,
  Index,
  Entity,
  getConnection
};
module.exports = framework;
