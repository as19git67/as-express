const crypto = require('crypto');
const {DateTime} = require("luxon");
const LocalStrategy = require('passport-local').Strategy;
const BearerStrategy = require('passport-http-bearer').Strategy;
const BasicStrategy = require('passport-http').BasicStrategy;

class AsPassport {
  #passport;
  #database;

  constructor(passport, database) {
    this.#passport = passport;
    this.#database = database;
  }

  async #serializeUser(user) {
    if (!user || !user.id) {
      throw new Error("User not specified", {cause: "nouser"});
    }
    return user.id; // id will be stored in the session
  }

  async #deserializeUser(userId) {
    if (!userId) {
      throw new Error("userId not specified", {cause: "nouserid"});
    }
    return this.#database.getUserById(userId);
  }

  async init() {
    // Passport session setup.
    //   To support persistent login sessions, Passport needs to be able to
    //   serialize users into and deserialize users out of the session.  Typically,
    //   this will be as simple as storing the user ID when serializing, and finding
    //   the user by ID when deserializing.
    this.#passport.serializeUser((user, done) => {
      this.#serializeUser(user).then(userId => {
        done(null, userId);
      }).catch(error => {
        done(error, user);
      });
    });

    this.#passport.deserializeUser((userId, done) => {
      this.#deserializeUser(userId).then(user => {
        done(null, user);
      }).catch(error => {
        done(error, userId);
      });
    });

    this.#passport.use('bearer', new BearerStrategy((accessToken, done) => {
      console.log('Bearer Strategy with token ' + accessToken);
      console.log('BEARER Strategy');
      this.#database.getUserByAccessToken(accessToken).then(user => {
        const now = DateTime.now();
        if (now > user.ExpiredAfter) {
          const error = new Error(`User with id ${user.id} is expired`);
          console.log(error.message);
          done(null, false, {message: 'user expired'});
        }
        if (now > user.TokenExpiredAfter) {
          const error = new Error(`AccessToken for user with id ${user.id} is expired`);
          console.log(error.message);
          done(null, false, {message: 'access token expired'});
        }

        done(null, user);

      }).catch(error => {
        console.error("database.getUserByAccessToken failed");
        done(error);
      });
    }));

    this.#passport.use('basic', new BasicStrategy((email, password, done) => {
        console.log("BASIC STRATEGY", email);

        this.#database.validateUser(email, password)
        .then(user => {
          done(null, user);
        })
        .catch(error => {
          done(error);
        });
      }
    ));

    this.#passport.use('local', new LocalStrategy((email, password, done) => {
        console.log("LOCAL STRATEGY", email);

        this.#database.validateUser(email, password)
        .then(user => {
          done(null, user);
        })
        .catch(error => {
          done(error);
        });
      }
    ));

  }
}

module.exports = AsPassport;