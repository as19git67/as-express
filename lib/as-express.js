import _ from 'lodash';
import fs from 'fs';
import path from 'path';
import https from 'https';
import waitFor from 'p-wait-for';
import http from 'http';
import debug from 'debug';
import CORS from 'cors';
import passport from 'passport';
import express from 'express';
import { fileURLToPath } from 'url';
import AsPassport from './as-passport.js';
import config from './config.js';
import DB from './database.js';
import dbSchema from './schema.js';
import UserDatabaseMixin from './userDatabaseMixin.js';
import permissions from './permissions.js';
import userRouteConfig from './routes/user.js';
import roleRouteConfig from './routes/role.js';
import authRouteConfig from './routes/auth.js';
import userDatabaseMixin from "./userDatabaseMixin.js";

class HttpError {
  constructor(errorCode, msg) {
    this.status = errorCode;
    this.message = msg;

    Error.captureStackTrace(this);
    Error.call(this, msg);
  }
}

export default class AsExpress {
  #haveHttpServer = false;

  #port;

  #secure = false; // true if https is configured

  #sockets = new Set();

  #secureSockets = new Set();

  #httpServerTerminating = false;

  #database;

  #dirname;

  constructor(appName, app) {
    const filename = fileURLToPath(import.meta.url);
    this.#dirname = path.dirname(filename);

    this.appName = appName;
    this.app = app;
    debug(`${this.appName}:server`);
  }

  async init(options) {
    options || (options = {});
    if (options.permissions) {
      this.permissions = _.extend(options.permissions, permissions);
    } else {
      this.permissions = permissions;
    }
    let completeSchema = dbSchema;
    if (options.dbSchema) {
      completeSchema = dbSchema.concat(options.dbSchema);
    }
    const dbMixins = [userDatabaseMixin];
    if (options.dbMixins) {
      if (_.isArray(options.dbMixins)) {
        for (const dbMixin of options.dbMixins) {
          dbMixins.push(dbMixin);
        }
      } else {
        dbMixins.push(options.dbMixins);
      }
    }
    await this.#initDB(completeSchema, dbMixins);
    await this.#initData();
    this.app.set('database', this.#database);
    this.#initApiRouter();
    await this.#initPassport();
    await this.#startHttpServer();
  }

  async #initData() {
    const userId = await this.#database.createUser('anton@schegg.de', 'antonschegg');
    const adminRoleId = await this.#database.createRole('admin', this.permissions); // admin role with all permissions in role
    await this.#database.assignRoleToUser(adminRoleId, userId);
  }

  async #initDB(schema, dbMixins) {
    const { adminUser } = config;
    if (!adminUser) {
      console.log('Not checking if initialization needed, because adminUser is not configured');
      return;
    }

    this.#database = new DB({ appName: this.appName, mixins: dbMixins });

    const exists = await this.#database.isSchemaOK(schema);
    if (exists) {
      console.log('Database schema is ok. Not performing initial config.');
    } else {
      const { initialAdminPassword } = config;
      if (initialAdminPassword) {
        try {
          await this.#database.makeSchemaUpToDate(schema);
        } catch (ex) {
          console.log('ERROR: Creating or upgrading database schema failed: ', ex);
          throw ex;
        }
      } else {
        const errMsg = 'ERROR: Not creating or upgrading database schema, because initialAdminPassword is not configured';
        console.log(errMsg);
        throw new Error(errMsg);
      }
    }
  }

  async #initPassport() {
    // Note: session is not needed, if passport.session() below is not called
    // this.app.use(session({
    //   secret: config['express-session-secret'],
    //   resave: true,
    //   saveUninitialized: true,
    // }));
    this.app.use(passport.initialize());
    //    this.app.use(passport.session()); // don't use persistent login sessions
    const asPassport = new AsPassport(passport, this.#database);
    await asPassport.init();
  }

  #initApiRouter() {
    this.addRouter('/api/auth', authRouteConfig);
    this.addRouter('/api/role', roleRouteConfig);
    this.addRouter('/api/user', userRouteConfig);
  }

  async #startHttpServer() {
    this.#haveHttpServer = false;
    const { httpPort } = config;
    const { httpsPort } = config;
    if (httpsPort) {
      if (_.isString(this.#port)) {
        this.#port = parseInt(httpsPort, 10);
      } else {
        this.#port = httpsPort;
      }
      try {
        const { dataDirectory } = config;
        const pemDir = dataDirectory || this.#dirname;
        const secureOptions = {
          key: fs.readFileSync(path.resolve(pemDir, 'key.pem')),
          cert: fs.readFileSync(path.resolve(pemDir, 'cert.pem')),
        };
        // Create HTTPS server
        this.server = https.createServer(secureOptions, this.app);

        // Listen on provided port, on all network interfaces.
        this.server.listen(httpsPort, () => {
          console.log(`${this.appName} https server listening on port ${this.#port}`);
        });
        this.#haveHttpServer = true;
        this.#secure = true;
      } catch (e) {
        console.log('EXCEPTION while creating the https server:', e);
        throw e;
      }
    } else {
      try {
        if (_.isString(this.#port)) {
          this.#port = parseInt(httpPort, 10);
        } else {
          this.#port = httpPort;
        }
        // no https -> try http

        this.server = http.createServer(this.app);

        // Listen on provided port, on all network interfaces.
        this.server.listen(httpPort, () => {
          console.log(`${this.appName} http server listening on port ${this.#port}`);
        });
        this.#haveHttpServer = true;
      } catch (e) {
        console.log('EXCEPTION while creating the https server:', e);
        throw e;
      }
    }
    if (this.#haveHttpServer) {
      this.app.set('port', this.#port);
      this.server.on('error', (error) => {
        if (error.syscall !== 'listen') {
          throw error;
        }

        const bind = typeof this.#port === 'string'
          ? `Pipe ${this.#port}`
          : `Port ${this.#port}`;

        // handle specific listen errors with friendly messages
        switch (error.code) {
          case 'EACCES':
            console.error(`${bind} requires elevated privileges`);
            process.exit(1);
            break;
          case 'EADDRINUSE':
            console.error(`${bind} is already in use`);
            process.exit(1);
            break;
          default:
            throw error;
        }
      });
      this.server.on('listening', () => {
        const addr = this.server.address();
        const bind = typeof addr === 'string'
          ? `pipe ${addr}`
          : `port ${addr.port}`;
        debug(`Listening on ${bind}`);
      });
      this.server.on('connection', (socket) => {
        if (this.#httpServerTerminating) {
          socket.destroy();
        } else {
          this.#sockets.add(socket);

          socket.once('close', () => {
            this.#sockets.delete(socket);
          });
        }
      });

      this.server.on('secureConnection', (socket) => {
        if (this.#httpServerTerminating) {
          socket.destroy();
        } else {
          this.#secureSockets.add(socket);

          socket.once('close', () => {
            this.#secureSockets.delete(socket);
          });
        }
      });
    }
  }

  /**
   * Evaluate whether additional steps are required to destroy the socket.
   *
   * @see https://github.com/nodejs/node/blob/57bd715d527aba8dae56b975056961b0e429e91e/lib/_http_client.js#L363-L413
   */
  #destroySocket(socket) {
    socket.destroy();

    console.log('destroying sockets to terminate the http server');

    if (socket.server instanceof http.Server) {
      this.#sockets.delete(socket);
    } else {
      this.#secureSockets.delete(socket);
    }
  }

  // Code for terminateHttpServer take from https://github.com/gajus/http-terminator
  // Copyright (c) 2020, Gajus Kuizinas (http://gajus.com/)
  async terminateHttpServer() {
    if (this.#httpServerTerminating) {
      console.warn('already terminating HTTP server');
      return this.#httpServerTerminating;
    }

    return this.#httpServerTerminating = new Promise(async (resolve, reject) => {
      this.server.on('request', (incomingMessage, outgoingMessage) => {
        if (!outgoingMessage.headersSent) {
          outgoingMessage.setHeader('connection', 'close');
        }
      });

      for (const socket of this.#sockets) {
        // This is the HTTP CONNECT request socket.
        if (!(socket.server instanceof http.Server)) {
          continue;
        }

        const serverResponse = socket._httpMessage;

        if (serverResponse) {
          if (!serverResponse.headersSent) {
            serverResponse.setHeader('connection', 'close');
          }

          continue;
        }

        this.#destroySocket(socket);
      }

      for (const socket of this.#secureSockets) {
        // @ts-expect-error Unclear if I am using wrong type or how else this should be handled.
        const serverResponse = socket._httpMessage;

        if (serverResponse) {
          if (!serverResponse.headersSent) {
            serverResponse.setHeader('connection', 'close');
          }

          continue;
        }

        this.#destroySocket(socket);
      }

      // Wait for all in-flight connections to drain, forcefully terminating any
      // open connections after the given timeout
      try {
        await waitFor(() => this.#sockets.size === 0 && this.#secureSockets.size === 0, {
          interval: 10,
          timeout: 1000, // ms
        });
      } catch {
        // Ignore timeout errors
      } finally {
        for (const socket of this.#sockets) {
          this.#destroySocket(socket);
        }

        for (const socket of this.#secureSockets) {
          this.#destroySocket(socket);
        }
      }

      this.server.close((error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  async #isAllowed(userId, resource, action) {
    if (resource === '/api/auth' && action === 'post') {
      return true;
    }
    return this.#database.checkUserIsAllowed(userId, resource, action);
  }

  get secure() {
    return this.#secure;
  }

  addRouter(urlPath, routeConfig) {
    const router = express.Router();

    let corsOptions = {
      origin: config.CORS_origin,
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    };

    if (process.env.NODE_ENV === 'DEV') {
      corsOptions = {
        origin: ['http://localhost:5173', 'https://localhost:5173'],
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', // allowedHeaders: ['Content-Type', 'Authorization', 'Location'],
        preflightContinue: false,
        optionsSuccessStatus: 204,
      };
    }

    if (routeConfig.bypassAuth) {
      corsOptions.credentials = false;
    } else {
      corsOptions.credentials = true; // sets 'Access-Control-Allow-Credentials' to true
    }

    // add various middleware functions - they get called one after the other...
    router.use((req, res, next) => {
      console.log('doCORS');
      CORS(corsOptions)(req, res, next);
    });

    if (!routeConfig.bypassAuth) {
      router.use((req, res, next) => {
        console.log('passport authenticate');
        // check for bearer authentication header with token
        let token = '';
        if (req.headers && req.headers.authorization) {
          const parts = req.headers.authorization.split(' ');
          if (parts.length === 2) {
            const scheme = parts[0];
            const
              credentials = parts[1];
            if (/^Bearer/i.test(scheme)) {
              token = credentials;
            }
          }
        }
        if (token) {
          passport.authenticate('bearer', { session: false })(req, res, next);
        } else {
          passport.authenticate('basic', { session: false })(req, res, next);
          // passport.authenticate('basic', {session: false}, function(err, user, info) {
          //   if (err) { return next(err); }
          //   if (!user) { return res.redirect('/login'); }
          //   req.logIn(user, function(err) {
          //     if (err) { return next(err); }
          //     return next();
          //   });
          // })(req, res, next);
        }
      });

      // add the role permissions middleware to check users role has required permissions
      router.use((req, res, next) => {
        console.log('role permissions');
        let userId;
        if ((req.user) && (req.user.id)) {
          userId = req.user.id;
        } else {
          next(new HttpError(401, 'User not authenticated'));
        }

        const url = req.originalUrl.split('?')[0];
        let resource;
        if (!routeConfig.numPathComponents) {
          resource = url;
        } else {
          resource = url.split('/').slice(0, routeConfig.numPathComponents + 1).join('/');
        }

        const action = req.method.toLowerCase();

        console.log(`Requesting ${action} on ${resource} by user ${userId}`);

        this.#isAllowed(userId, resource, action)
          .then((allowed) => {
            if (allowed) {
              console.log(`Allowed ${action} on ${resource} by user ${userId}`);
              next();
            } else {
              console.log(`Not allowed ${action} on ${resource} by user ${userId}`);
              next(new HttpError(401, 'Insufficient permissions to access resource'));
            }
          }).catch((reason) => {
          // todo use reason in error
            next(new Error('Error checking permissions to access resource'));
          });
      });
    }

    if (routeConfig && routeConfig.routes) {
      for (const verb of ['get', 'post', 'put', 'delete']) {
        if (routeConfig.routes[verb]) {
          const route = routeConfig.routes[verb];
          if (route.path && route.handler) {
            console.log(`adding express router for ${verb} ${urlPath} ${route.path}`);
            router[verb](route.path, route.handler);
          }
        }
      }
      // register the router with the app
      this.app.use(urlPath, router);
    }
  }
}
