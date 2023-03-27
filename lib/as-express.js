const _ = require('lodash');
const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");
const debug = require('debug');
const session = require("express-session");
const CORS = require('cors');
const passport = require('passport');
const { AsPassport } = require('./as-passport');
const config = require('./config');
const DB = require('./database');
const schema = require('./schema');
const permissions = require('./permissions');
const userRouteConfig = require('./routes/user');
const authRouteConfig = require('./routes/auth');
const express = require("express");

class AsExpress {
  #haveHttpServer = false;
  #port;
  #database;

  constructor(appName, app) {
    this.appName = appName;
    this.app = app;
    debug(`${this.appName}:server`)
  }

  async init(options) {
    options || (options = {});
    if (options.permissions) {
      this.permissions = _.extend(options.permissions, permissions);
    } else {
      this.permissions = permissions;
    }
    let completeSchema = schema;
    if (options.dbSchema) {
      completeSchema = schema.concat(options.dbSchema)
    }
    await this.#initDB(completeSchema);
    await this.#initData();
    this.app.set('database', this.#database);
    this.#initApiRouter();
    await this.#initPassport();
    await this.#startHttpServer();
  }

  async #initData() {
    return this.#database.createUser('anton@schegg.de', 'antonschegg');
  }

  async #initDB(schema) {
    let adminUser = config.adminUser;
    if (!adminUser) {
      console.log("Not checking if initialization needed, because adminUser is not configured");
      return;
    }

    this.#database = new DB({appName: this.appName});

    const exists = await this.#database.isSchemaOK(schema);
    if (exists) {
      console.log("Database schema is ok. Not performing initial config.");
      return;
    } else {
      const initialAdminPassword = config.initialAdminPassword;
      if (initialAdminPassword) {
        try {
          await this.#database.makeSchemaUpToDate(schema);
        } catch (ex) {
          console.log("ERROR: Creating or upgrading database schema failed: ", ex);
          throw ex;
        }
      } else {
        const errMsg = "ERROR: Not creating or upgrading database schema, because initialAdminPassword is not configured";
        console.log(errMsg);
        throw new Error(errMsg);
      }
    }

  }

  async #initPassport() {
    this.app.use(session({
      secret: config['express-session-secret'],
      resave: true,
      saveUninitialized: true
    }));
    this.app.use(passport.initialize());
    this.app.use(passport.session()); // persistent login sessions
    const asPassport = new AsPassport(passport, this.#database);
    await asPassport.init();
  }

  #initApiRouter() {
    this.addRouter('/api/user', userRouteConfig);
    this.addRouter('/api/auth', authRouteConfig);
  }

  async #startHttpServer() {
    this.#haveHttpServer = false;
    const httpPort = config.httpPort;
    const httpsPort = config.httpsPort;
    if (httpsPort) {
      this.#port = httpsPort;
      try {
        const secureOptions = {
          key: fs.readFileSync(path.resolve(__dirname, 'key.pem')),
          cert: fs.readFileSync(path.resolve(__dirname, 'cert.pem'))
        };
        // Create HTTPS server
        this.server = https.createServer(secureOptions, this.app);

        // Listen on provided port, on all network interfaces.
        this.server.listen(httpsPort, () => {
          console.log(`${this.appName} https server listening on port ${this.#port}`);
        });
        this.#haveHttpServer = true;
      } catch (e) {
        console.log("EXCEPTION while creating the https server:", e);
        throw e;
      }
    } else {
      try {
        this.#port = httpPort;
        // no https -> try http

        this.server = http.createServer(this.app);

        // Listen on provided port, on all network interfaces.
        this.server.listen(httpPort, () => {
          console.log(`${this.appName} http server listening on port ${this.#port}`);
        });
        this.#haveHttpServer = true;
      } catch (e) {
        console.log("EXCEPTION while creating the https server:", e);
        throw e;
      }
    }
    if (this.#haveHttpServer) {
      this.app.set('port', this.#port);
     this.server.on('error', (error) => {
        if (error.syscall !== 'listen') {
          throw error;
        }

        let bind = typeof this.#port === 'string'
          ? 'Pipe ' + this.#port
          : 'Port ' + this.#port;

        // handle specific listen errors with friendly messages
        switch (error.code) {
          case 'EACCES':
            console.error(bind + ' requires elevated privileges');
            process.exit(1);
            break;
          case 'EADDRINUSE':
            console.error(bind + ' is already in use');
            process.exit(1);
            break;
          default:
            throw error;
        }
      });
      this.server.on('listening', () => {
        const addr = this.server.address();
        let bind = typeof addr === 'string'
          ? 'pipe ' + addr
          : 'port ' + addr.port;
        debug('Listening on ' + bind);
      });
    }
  }

  addRouter(path, routeConfig) {
    const router = express.Router();

    let corsOptions = {
      origin: config.CORS_origin
    };

    if (process.env.NODE_ENV === 'DEV') {
      corsOptions = {
        origin: ["http://localhost:5173", "https://localhost:5173"],
        methods: "GET,HEAD,PUT,PATCH,POST,DELETE", // allowedHeaders: ['Content-Type', 'Authorization', 'Location'],
        preflightContinue: false,
        optionsSuccessStatus: 204
      };
    }

    router.options('/', CORS(corsOptions)); // enable pre-flight

    // add various middleware functions - they get called one after the other...
    router.use(function doCORS(req, res, next) {
      console.log("doCORS");
      CORS(corsOptions)(req, res, next);
    });

    if(!routeConfig.bypassAuth) {
      router.use(function doPassportAuthentication(req, res, next) {
        console.log("passport authenticate");
        // check for bearer authentication header with token
        let token = '';
        if (req.headers && req.headers.authorization) {
          let parts = req.headers.authorization.split(' ');
          if (parts.length === 2) {
            let scheme = parts[0], credentials = parts[1];
            if (/^Bearer/i.test(scheme)) {
              token = credentials;
            }
          }
        }
        if (token) {
          passport.authenticate('bearer', {session: false})(req, res, next);
        } else {
          passport.authenticate('basic', {session: false})(req, res, next);
        }
      });
    }

    if (routeConfig && routeConfig.routes) {
      for (const verb of ['get', 'post', 'put', 'delete']) {
        if (routeConfig.routes[verb]) {
          const route = routeConfig.routes[verb];
          if (route.path && route.handler) {
            console.log(`adding express router for ${verb} ${path} ${route.path}`);
            router[verb](route.path, route.handler);
          }
        }
      }
      // register the router with the app
      this.app.use(path, router);
    }
  }
}

module.exports = AsExpress;
