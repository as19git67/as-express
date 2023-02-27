const _ = require('lodash');
const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");
const debug = require('debug');

const config = require('./config');
const DB = require('./database');
const schema = require('./schema');
const permissions = require('./permissions');
const userRouter = require('./routes/user');

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
    this.app.set('database', this.#database);
    this.#initApiRouter();
    await this.#startHttpServer();
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

  #initApiRouter() {
    this.app.use('/api/user', userRouter);
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
}

module.exports = AsExpress;
