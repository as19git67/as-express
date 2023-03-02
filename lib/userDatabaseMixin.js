const _ = require("lodash");
const {DateTime} = require("luxon");
const speakeasy = require('speakeasy');
const hat = require('hat');
const crypto = require("crypto");

let UserDatabaseMixin = {

  addUser: async function (email, passwordSalt, passwordHash) {
    let user = {
      Email: email,
      PasswordSalt: passwordSalt,
      PasswordHash: passwordHash,
      ExpiredAfter: DateTime.now().plus({'days': 7}).toISO(),
      LoginProvider: 'local',
      LoginProviderKey: '',
    };
    const result = await this.knex('Users').insert(user).returning('id');
    return result[0].id;
  },

  createUser: async function (email, password) {
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
        'Can\'t create user, because user with same email already exists');
    }

    const salt = crypto.randomBytes(32).toString('base64');

    // Hashing user's salt and password with 1000 iterations, 64 length and sha512 digest
    const passwordHash = crypto.pbkdf2Sync(password, salt, 1000, 64, `sha512`).toString(`hex`);

    return this.addUser(email, salt, passwordHash);
  },

  getUserById: async function (id) {
    const result = await this.knex.select().table('Users').where({id: id});
    if (result.length === 1) {
      return this._extractSaveUserData(result[0]);
    } else {
      throw new Error(`User with id ${id} does not exist`);
    }
  },

  getUserByEmail: async function (email) {
    const result = await this.knex.select().table('Users').where({Email: email});
    if (result.length === 1) {
      return this._extractSaveUserData(result[0]);
    } else {
      throw new Error(`User with email ${email} does not exist`);
    }
  },

  updateUser: async function (userId, data) {
    const updateData = {};
    if (data.email) {
      updateData.Email = data.email;
    }
    if (data.expiredAfter) {
      updateData.ExpiredAfter = data.expiredAfter;
    }
    if (data.emailConfirmed) {
      updateData.EmailConfirmed = data.emailConfirmed;
    }
    if (data.initials) {
      updateData.Initials = data.initials;
    }

    return this.knex.table("Users").where('id', userId).update(updateData);
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

  validateUser: async function (email, password) {
    let result = await this.knex.select()
    .table('Users')
    .where({Email: email});
    if (result.length === 0) {
      throw new Error(`Unknown user with email ${email}`);
    }
    const user = result[0];
    const salt = user.PasswordSalt;
    const hash = Buffer.from(user.PasswordHash, 'hex');
    const expiredAfter = user.ExpiredAfter;
    if (expiredAfter) {
      if (DateTime.now() > DateTime.fromISO(expiredAfter)) {
        new Error(`User with email ${email} is expired`);
      }
    }
    const passwordHash = crypto.pbkdf2Sync(password, salt, 1000, 64, `sha512`);
    if (crypto.timingSafeEqual(hash, passwordHash)) {
      return this._extractSaveUserData(user);
    } else {
      throw new Error(`Wrong password for user ${email}`);
    }
  },

  _extractSaveUserData: function (user) {
    const data = _.pick(user, ['id', 'Email', 'EmailConfirmed', 'Initials', 'ExpiredAfter', 'LoginProvider']);
    data.ExpiredAfter = DateTime.fromISO(user.ExpiredAfter);
    return data;
  },

}

module.exports = UserDatabaseMixin;

