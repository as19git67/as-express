const _ = require("lodash");
const {DateTime} = require("luxon");
const speakeasy = require('speakeasy');
const hat = require('hat');
const crypto = require("crypto");
const config = require('./config');

let UserDatabaseMixin = {

  addUser: async function (email, passwordSalt, passwordHash) {
    let user = {
      Email: email,
      EmailConfirmed: false,
      PasswordSalt: passwordSalt,
      PasswordHash: passwordHash,
      ExpiredAfter: DateTime.now().plus({'days': 7}).toISO(),
      LoginProvider: 'local',
      LoginProviderKey: '',
    };
    const result = await this.knex('Users').insert(user).returning('id');
    return result[0].id;
  },

  _createPasswordHash: function (password, salt) {
    // Hashing user's salt and password with 1000 iterations, 64 length and sha512 digest
    const passwordHash = crypto.pbkdf2Sync(password, salt, 1000, 64, `sha512`).toString(`hex`);
    return passwordHash;
  }, createUser: async function (email, password) {
    if (email === 'undefined' || !email) {
      throw new Error('email undefined');
    }
    if (password === 'undefined' || !password) {
      throw new Error('password undefined');
    }
    let result = await this.knex.select()
    .table('Users')
    .where({Email: email, EmailConfirmed: false});
    if (result.length > 0) {
      const ids = _.map(result, (user) => {
        return user.id;
      });
      await this.deleteUsers(ids);
    }
    result = await this.knex.select()
    .table('Users')
    .where({Email: email});
    if (result.length > 0) {
      throw new Error(
        'Can\'t create user, because user with same email already exists', {cause: 'exists'});
    }

    const salt = crypto.randomBytes(32).toString('base64');
    const passwordHash = this._createPasswordHash(password, salt);

    return this.addUser(email, salt, passwordHash);
  },

  getUser: async function () {
    const result = await this.knex.select().table('Users');
    return _.map(result, (r) =>{
      return this._extractSaveUserData(r);
    });
  },

  getUserById: async function (id) {
    const result = await this.knex.select().table('Users').where({id: id});
    if (result.length === 1) {
      return this._extractSaveUserData(result[0]);
    } else {
      throw new Error(`User with id ${id} does not exist`);
    }
  },

  existsUserById: async function (id) {
    const result = await this.knex.select().table('Users').where({id: id});
    return result.length === 1;
  },

  getUserByEmail: async function (email) {
    const result = await this.knex.select().table('Users').where({Email: email});
    if (result.length === 1) {
      return this._extractSaveUserData(result[0]);
    } else {
      throw new Error(`User with email ${email} does not exist`);
    }
  },

  _updateUser: function (existingUserData, data, updateData) {
    if (data.ExpiredAfter) {
      if (!DateTime.isDateTime(data.ExpiredAfter)) {
        throw new Error(`ExpiredAfter must be DateTime`);
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
    return this.knex.table("Users").where('id', existingUserData.id).update(updateData);
  },

  updateUserById: async function (userId, data) {
    const result = await this.knex.select().table('Users').where({id: userId});
    if (result.length !== 1) {
      throw new Error(`User with id ${id} does not exist`);
    }
    const updateData = {};
    if (data.Email) {
      updateData.Email = data.Email;
    }
    return this._updateUser(result[0], data, updateData);
  },

  updateUserByEmail: async function (email, data) {
    const result = await this.knex.select().table('Users').where({Email: email});
    if (result.length !== 1) {
      throw new Error(`User with email ${email} does not exist`);
    }
    const updateData = {};
    return this._updateUser(result[0], data, updateData);
  },

  deleteUsers: async function (userIds) {
    return this.knex.table('Users').whereIn('id', userIds).delete();
  },

  getUserByAccessToken: async function (accessToken) {
    if (!accessToken) {
      throw new Error("Can't get user by undefined access token.");
    }
    if (!_.isString(accessToken)) {
      throw new Error("Can't get user by non-string access token.");
    }

    const queryResult = await this.knex.select().table('Users')
    .join('UserAccessTokens', function () {
      this.on('Users.id', '=', 'UserAccessTokens.idUser')
    }).where(function () {
      this.where('AccessToken', accessToken)
    });

    if (_.isArray(queryResult) && queryResult.length > 0) {
      const saveUserData = this._extractSaveUserData(queryResult[0]);
      saveUserData.TokenExpiredAfter = DateTime.fromISO(queryResult[0].TokenExpiredAfter);
      return saveUserData;
    } else {
      console.log("User with access token ", accessToken, " does not exist.");
      return undefined;
    }
  },

  isExpired: function (user) {
    const expiredAfter = DateTime.fromISO(user.ExpiredAfter);
    if (!DateTime.isDateTime(expiredAfter)) {
      throw new Error('must be DateTime', {cause: 'type'});
    }
    if (expiredAfter) {
      return DateTime.now() > expiredAfter;
    }
    return false;
  },

  validateUser: async function (email, password) {
    let result = await this.knex.select()
    .table('Users')
    .where({Email: email});
    if (result.length === 0) {
      throw new Error(`Unknown user with email ${email}`, {cause: 'unknown'});
    }
    const user = result[0];
    const salt = user.PasswordSalt;
    const hash = Buffer.from(user.PasswordHash, 'hex');

    if (this.isExpired(user)) {
      throw new Error(`User with email ${email} is expired`, {cause: 'expired'});
    }
    const passwordHash = crypto.pbkdf2Sync(password, salt, 1000, 64, `sha512`);
    if (crypto.timingSafeEqual(hash, passwordHash)) {
      return this._extractSaveUserData(user);
    } else {
      throw new Error(`Wrong password for user ${email}`, {cause: 'invalid'});
    }
  },

  createAccessTokenForUser: async function (userId) {
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
    const tokenLifetimeInMinutes = config.tokenLifetimeInMinutes;
    const accessToken = hat().toString('base64');
    const refreshToken = hat().toString('base64');
    let tokenData = {
      idUser: userId,
      AccessToken: accessToken,
      RefreshToken: refreshToken,
      AccessTokenExpiredAfter: DateTime.now().plus({'minutes': tokenLifetimeInMinutes}).toISO(),
    };

    const result = await this.knex('UserAccessTokens').insert(tokenData);

    return tokenData;
  },

  _extractSaveUserData: function (user) {
    const data = _.pick(user, ['id', 'Email', 'EmailConfirmed', 'Initials', 'ExpiredAfter', 'LoginProvider', 'PasswordSalt']);
    data.ExpiredAfter = DateTime.fromISO(user.ExpiredAfter);
    return data;
  },

}

module.exports = UserDatabaseMixin;

