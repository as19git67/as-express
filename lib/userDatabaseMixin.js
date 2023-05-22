import _ from 'lodash';
import { DateTime } from 'luxon';
import speakeasy from 'speakeasy';
import hat from 'hat';
import crypto from 'crypto';
import config from './config.js';
import permissions from "../../asweb1/permissions.js";

const UserDatabaseMixin = {

  async addUser(email, passwordSalt, passwordHash) {
    const user = {
      Email: email,
      EmailConfirmed: false,
      PasswordSalt: passwordSalt,
      PasswordHash: passwordHash,
      ExpiredAfter: DateTime.now().plus({ days: 7 }).toISO(),
      LoginProvider: 'local',
      LoginProviderKey: '',
    };
    const result = await this.knex('Users').insert(user).returning('id');
    return result[0].id;
  },

  _createPasswordHash(password, salt) {
    // Hashing user's salt and password with 1000 iterations, 64 length and sha512 digest
    const passwordHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return passwordHash;
  },
  async createUser(email, password) {
    if (email === 'undefined' || !email) {
      throw new Error('email undefined');
    }
    if (password === 'undefined' || !password) {
      throw new Error('password undefined');
    }
    let result = await this.knex.select()
      .table('Users')
      .where({ Email: email, EmailConfirmed: false });
    if (result.length > 0) {
      const ids = _.map(result, (user) => user.id);
      await this.deleteUsers(ids);
    }
    result = await this.knex.select()
      .table('Users')
      .where({ Email: email });
    if (result.length > 0) {
      throw new Error('Can\'t create user, because user with same email already exists', { cause: 'exists' });
    }

    const salt = crypto.randomBytes(32).toString('base64');
    const passwordHash = this._createPasswordHash(password, salt);

    return this.addUser(email, salt, passwordHash);
  },

  async createRole(name, permissions) {
    if (!name) {
      throw new Error('Role name must be specified', { cause: 'undefined' });
    }
    if (!_.isObject(permissions)) {
      throw new Error('Role permissions must be an object', { cause: 'invalid' });
    }

    return this.knex.transaction(async (trx) => {
      const result = await trx('Roles').insert({ Name: name }).returning('id');
      const roleId = result[0].id;

      const checkHash = {};
      const allRolePermissions = [];
      const permissionKeys = Object.keys(permissions);
      permissionKeys.forEach((key) => {
        const permissionDef = permissions[key];
        permissionDef.resources.forEach((resource) => {
          permissionDef.permissions.forEach((permission) => {
            const checkKey = `${resource}_${permission}`;
            if (!checkHash[checkKey]) {
              allRolePermissions.push(
                {
                  idRole: roleId,
                  Resource: resource,
                  Permission: permission,
                },
              );
              checkHash[checkKey] = true;
            }
          });
        });
      });

      const inserts = await trx('RolePermissions').insert(allRolePermissions);
      console.log(`Inserted ${inserts.length} RolePermissions for role ${name}`);
      return roleId;
    });
  },

  async assignRoleToUser(roleId, userId) {
    const result = await this.knex('UserRoles').insert({ idUser: userId, idRole: roleId });
    console.log(`Inserted ${result.length} UserRoles for userId: ${userId}, roled: ${roleId}`);
  },

  async checkUserIsAllowed(userId, resource, action) {
    const queryResult = await this.knex.select(
      'Users.id as userId',
      'Users.Email',
      'Users.EmailConfirmed',
      'Users.Initials',
      'Users.ExpiredAfter',
      'Users.LoginProvider',
      'Users.PasswordSalt',
      'UserRoles.idRole',
      'RolePermissions.Resource',
      'RolePermissions.Permission',
    ).from('Users')
      .join('UserRoles', function () {
        this.on('Users.id', '=', 'UserRoles.idUser');
      })
      .join('RolePermissions', function () {
        this.on('UserRoles.idRole', '=', 'RolePermissions.idRole');
      })
      .where({ 'Users.id': userId, 'RolePermissions.Resource': resource, 'RolePermissions.Permission': action });

    return queryResult.length > 0;
  },

  async getUser() {
    const result = await this.knex.select().table('Users');
    return _.map(result, (r) => this._extractSaveUserData(r));
  },

  async getUserById(id) {
    if (id === undefined) {
      throw new Error('Undefined user id');
    }
    const result = await this.knex.select().table('Users').where({ id });
    if (result.length === 1) {
      return this._extractSaveUserData(result[0]);
    }
    throw new Error(`User with id ${id} does not exist`);
  },

  async existsUserById(id) {
    const result = await this.knex.select().table('Users').where({ id });
    return result.length === 1;
  },

  async getUserByEmail(email) {
    const result = await this.knex.select().table('Users').where({ Email: email });
    if (result.length === 1) {
      return this._extractSaveUserData(result[0]);
    }
    throw new Error(`User with email ${email} does not exist`);
  },

  _updateUser(existingUserData, data, updateData) {
    if (data.ExpiredAfter) {
      if (!DateTime.isDateTime(data.ExpiredAfter)) {
        throw new Error('ExpiredAfter must be DateTime');
      }
      updateData.ExpiredAfter = data.ExpiredAfter.toISO();
    }
    if (data.EmailConfirmed) {
      updateData.EmailConfirmed = data.EmailConfirmed;
    }
    if (data.Initials) {
      updateData.Initials = data.Initials;
    }
    if (data.Password) {
      const salt = existingUserData.PasswordSalt;
      updateData.PasswordHash = this._createPasswordHash(data.Password, salt);
    }
    return this.knex.table('Users').where('id', existingUserData.id).update(updateData);
  },

  async updateUserById(userId, data) {
    const result = await this.knex.select().table('Users').where({ id: userId });
    if (result.length !== 1) {
      throw new Error(`User with id ${id} does not exist`);
    }
    const updateData = {};
    if (data.Email) {
      updateData.Email = data.Email;
    }
    return this._updateUser(result[0], data, updateData);
  },

  async updateUserByEmail(email, data) {
    const result = await this.knex.select().table('Users').where({ Email: email });
    if (result.length !== 1) {
      throw new Error(`User with email ${email} does not exist`);
    }
    const updateData = {};
    return this._updateUser(result[0], data, updateData);
  },

  async deleteUsers(userIds) {
    return this.knex.table('Users').whereIn('id', userIds).delete();
  },

  async getUserByAccessToken(accessToken) {
    if (!accessToken) {
      throw new Error("Can't get user by undefined access token.");
    }
    if (!_.isString(accessToken)) {
      throw new Error("Can't get user by non-string access token.");
    }

    try {
      const queryResult = await this.knex.select(
        'Users.id',
        'Users.Email',
        'Users.EmailConfirmed',
        'Users.Initials',
        'Users.LoginProvider',
        'Users.PasswordSalt',
        'Users.ExpiredAfter',
        'UserAccessTokens.AccessToken',
        'UserAccessTokens.AccessTokenExpiredAfter',
      ).from('UserAccessTokens')
        .join('Users', function () {
          this.on('Users.id', '=', 'UserAccessTokens.idUser');
        }).where(function () {
          this.where('AccessToken', accessToken);
        });

      if (_.isArray(queryResult) && queryResult.length > 0) {
        const saveUserData = this._extractSaveUserData(queryResult[0]);
        saveUserData.AccessTokenExpiredAfter = DateTime.fromISO(queryResult[0].AccessTokenExpiredAfter);
        return saveUserData;
      }
    } catch (ex) {
      console.log('Selecting user by access token failed:');
      console.log(ex);
      throw ex;
    }
    console.log('User with access token ', accessToken, ' does not exist.');
    return undefined;
  },

  isExpired(user) {
    const expiredAfter = DateTime.fromISO(user.ExpiredAfter);
    if (!DateTime.isDateTime(expiredAfter)) {
      throw new Error('must be DateTime', { cause: 'type' });
    }
    if (expiredAfter) {
      return DateTime.now() > expiredAfter;
    }
    return false;
  },

  async validateUser(email, password) {
    const result = await this.knex.select()
      .table('Users')
      .where({ Email: email });
    if (result.length === 0) {
      throw new Error(`Unknown user with email ${email}`, { cause: 'unknown' });
    }
    const user = result[0];
    const salt = user.PasswordSalt;
    const hash = Buffer.from(user.PasswordHash, 'hex');

    if (this.isExpired(user)) {
      throw new Error(`User with email ${email} is expired`, { cause: 'expired' });
    }
    const passwordHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512');
    if (crypto.timingSafeEqual(hash, passwordHash)) {
      return this._extractSaveUserData(user);
    }
    throw new Error(`Wrong password for user ${email}`, { cause: 'invalid' });
  },

  async createAccessTokenForUser(userId) {
    let user;

    // check if user with given id exists
    try {
      user = await this.getUserById(userId);
    } catch (ex) {
      console.log(`Exception while getUserById(${userId}): ${ex.message}`);
      throw ex;
    }

    // check if user is not expired
    if (this.isExpired(user)) {
      const errorMessage = `User with id ${userId}, email ${user.Email} is expired`;
      console.log(errorMessage);
      throw new Error(errorMessage);
    }

    // create and save access token
    const { tokenLifetimeInMinutes } = config;
    const accessToken = hat().toString('base64');
    const refreshToken = hat().toString('base64');
    const tokenData = {
      idUser: userId,
      AccessToken: accessToken,
      RefreshToken: refreshToken,
      AccessTokenExpiredAfter: DateTime.now().plus({ minutes: tokenLifetimeInMinutes }).toISO(),
    };

    const result = await this.knex('UserAccessTokens').insert(tokenData);

    return tokenData;
  },

  async deleteAccessTokensForUser(userId) {
    let user;

    // check if user with given id exists
    try {
      user = await this.getUserById(userId);
    } catch (ex) {
      console.log(`Exception while getUserById(${userId}): ${ex.message}`);
      throw ex;
    }

    const result = this.knex.table('UserAccessTokens').where({ idUser: user.id }).delete();

    return result;
  },

  async deleteAccessToken(accessToken) {
    const result = this.knex.table('UserAccessTokens').where({ AccessToken: accessToken }).delete();
    return result;
  },

  async refreshAccessToken(accessToken, refreshToken) {
    if (!accessToken || !refreshToken) {
      throw new Error("accessToken can't be undefined", { cause: 'undefined' });
    }
    let result = this.knex.table('UserAccessTokens').where({
      AccessToken: accessToken,
      RefreshToken: refreshToken,
    });
    if (result.length === 0) {
      throw new Error('Unknown access token', { cause: 'unknown' });
    }
    const accessTokenInfo = result[0];
    if (accessTokenInfo.RefreshToken !== refreshToken) {
      throw new Error('Refresh token invalid', { cause: 'invalid' });
    }

    // create and save access token
    const { tokenLifetimeInMinutes } = config;
    const newAccessToken = hat().toString('base64');
    const updateData = {
      AccessToken: newAccessToken,
      AccessTokenExpiredAfter: DateTime.now().plus({ minutes: tokenLifetimeInMinutes }).toISO(),
    };

    result = this.knex.table('UserAccessTokens').where('AccessToken', accessToken).update(updateData);
    return result;
  },

  _extractSaveUserData(user) {
    const data = _.pick(user, ['id', 'Email', 'EmailConfirmed', 'Initials', 'LoginProvider', 'PasswordSalt']);
    data.ExpiredAfter = DateTime.fromISO(user.ExpiredAfter);
    return data;
  },

};

export default UserDatabaseMixin;
