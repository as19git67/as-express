const _ = require("lodash");
const { DateTime } = require("luxon");
const speakeasy = require('speakeasy');
const hat = require('hat');
const crypto = require("crypto");

let UserDatabaseMixin = {

  addUser: async function(email, passwordSalt, passwordHash) {
    let user = {
      Email: email,
      PasswordSalt: passwordSalt,
      PasswordHash: passwordHash,
      ExpiredAfter: DateTime.now().plus({'days': 7}).toISO(),
      LoginProvider: 'local',
      LoginProviderKey: '',
    };
    const result = await this.knex('Users').insert(user).returning('id');
    const id = result[0].id;
    return id;
  },

  createUser: async function(email, password) {
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

    const id = await this.addUser(email, salt, passwordHash);
    return id;
  },

  getUserByEmail: async function(email) {
    const result = await this.knex.select().table('Users').where({Email: email});
    if (result.length === 1) {
      return this._makeUserObject(result[0]);
    } else {
      console.log(`User with email ${email} does not exist.`);
      return undefined;
    }
  },

  deleteUsers: async function(userIds) {
    const result = await this.knex.table('Users').whereIn('id', userIds).delete();
    return result;
  },

  validateUser: async function(email, password) {
    let result = await this.knex.select()
    .table('Users')
    .where({Email: email});
    if (result.length === 0) {
      return false;
    }
    const user = result[0];
    const salt = user.PasswordSalt;
    const hash = user.PasswordHash;
    const expiredAfter = user.ExpiredAfter;
    if (expiredAfter) {
      if (DateTime.now() > DateTime.fromISO(expiredAfter)) {
        return false; // User already expired
      }
    }
    const passwordHash = crypto.pbkdf2Sync(password, salt, 1000, 64, `sha512`).toString(`hex`);
    return  hash === passwordHash && passwordHash;
  },

  _makeUserObject: function(userInfo) {
    return {
      email: userInfo.Email,
      name: userInfo.Name,
      encryptionKeyName: userInfo.EncryptionKeyName,
    };
  },

  getUser: async function(id) {
    const result = await this.knex.select().table('Users').where({Id: id});
    if (result.length === 1) {
      const userInfo = result[0];
      return {
        email: userInfo.Email,
        name: userInfo.Name,
        encryptionKeyName: userInfo.EncryptionKeyName,
      };
    } else {
      return undefined;
    }
  }

}

module.exports = UserDatabaseMixin;

