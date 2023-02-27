const passport = require('passport');
const crypto = require('crypto');
const LocalStrategy = require('passport-local');

class PassportIntegration {

  constructor() {
    passport.use(new LocalStrategy(this.verifyLocal));
  }

  verifyLocal(username, password, cb) {
    const userFromDb = 'xxx'; // todo
    if (!userFromDb) {
      return cb(null, false, {message: 'Incorrect username or password.'});
    }

    crypto.pbkdf2(password, userFromDb.salt, 310000, 32, 'sha256', function (err, hashedPassword) {
      if (err) {
        return cb(err);
      }
      if (!crypto.timingSafeEqual(userFromDb.hashed_password, hashedPassword)) {
        return cb(null, false, {message: 'Incorrect username or password.'});
      }
      return cb(null, userFromDb);
    });
  }
}

module.exports = PassportIntegration;