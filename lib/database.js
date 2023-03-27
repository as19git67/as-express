const _ = require('lodash');
const path = require("path");
const config = require('./config');
const UserDatabaseMixin = require('./userDatabaseMixin');

class DB {
  #dbClient;

  constructor(options) {
    options || (options = {});

    const dbHost = config.dbHost;
    const dbName = config.dbName;
    const dbUsername = config.dbUsername;
    const dbPassword = config.dbPassword;
    const dbDebug = config.dbDebug;
    this.#dbClient = config.dbClient;

    let knexConfig = {
      client: this.#dbClient,
      debug: dbDebug,
      connection: {},
      pool: {
        min: 0, max: 30
      }
    };

    switch (this.#dbClient) {
      case 'sqlite3':
        knexConfig.connection = {
          filename: config.dbFilename ? config.dbFilename :
            options.appName ? path.resolve('./', `${options.appName}.sqlite`) : path.resolve('./', 'app.sqlite'),
        }
        break;
      default:
        knexConfig.connection = {
          host: dbHost,
          user: dbUsername,
          password: dbPassword,
          database: dbName,
          options: {
            encrypt: true,
            trustServerCertificate: true,
            requestTimeout: 30000
          }
        }
    }

    this.knex = require('knex')(knexConfig);
  }

  async isSchemaOK(schema) {
    return await this._existsTable('XXX');
  }

  async makeSchemaUpToDate(schema) {
    const tables = _.map(schema, (tableDef) => {
      return tableDef.tableName;
    }).reverse();
    await this._dropAll(tables);
    await this._createTables(schema);
  }

  async _createTables(schema) {
    console.log('Creating database tables...');


    // CREATE TABLES
    for (const tableDef of schema) {
      const tableName = tableDef.tableName;
      try {
        console.log("creating table " + tableName);
        await this.knex.schema.createTable(tableName, (t) => {
          for (const column of tableDef.columns) {
            let tRes;
            switch (column.type) {
              case "autoincrement":
                tRes = t.increments(column.name);
                break;
              case "string":
                tRes = t.string(column.name, column.length);
                break;
              case "integer":
                tRes = t.integer(column.name);
                break;
              case "date":
                tRes = t.date(column.name);
                break;
              case "time":
                tRes = t.time(column.name);
                break;
              case "dateTime":
                tRes = t.datetime(column.name);
                break;
              case "boolean":
                tRes = t.boolean(column.name);
                break;
            }
            if (column.primary_key) {
              tRes = tRes.primary();
            }
            if (column.unique) {
              tRes = tRes.unique();
            }
            if (column.nullable === false) {
              tRes = tRes.notNullable();
            }
            if (column.default !== undefined) {
              tRes = tRes.defaultTo(column.default);
            }
          }
          if (_.isArray(tableDef.indexes)) {
            for (const index of tableDef.indexes) {
              const uniqueIndex = index.unique;
              if (uniqueIndex) {
                t.unique(index.columns, index.name)
              } else {
                t.index(index.columns, index.name)
              }
            }
          }
          if (_.isArray(tableDef.foreign_keys)) {
            for (const fk of tableDef.foreign_keys) {
              t.foreign(fk.columns, fk.name).references(fk.foreign_columns).inTable(fk.foreign_table);
            }
          }
        });
      } catch (ex) {
        console.log("creating table " + tableName + " failed");
        console.log(ex);
        throw ex;
      }
    }
  }

  async _existsTable(table, callback) {
    return await new Promise(async (resolve, reject) => {
      if (this.#dbClient === 'sqlite3') {
        //    knex.raw("SELECT count(*) FROM INFORMATION_SCHEMA.TABLES where TABLE_NAME='" + table + "'").then(function (queryResult) {
        this.knex('sqlite_master')
        .where({type: 'table', name: table})
        .count('* as cnt')
        .then(function (queryResult) {
          let cnt = queryResult[0].cnt;
          resolve(cnt > 0);
        })
        .catch(function (err) {
          console.log(
            'Query to check whether table ' + table + ' exists failed');
          reject(err);
        });
      } else {
        //    knex.raw("SELECT count(*) FROM INFORMATION_SCHEMA.TABLES where TABLE_NAME='" + table + "'").then(function (queryResult) {
        this.knex('INFORMATION_SCHEMA.TABLES').where({TABLE_NAME: table}).count('* as cnt').then(function (queryResult) {
          let cnt = queryResult[0].cnt;
          resolve(cnt > 0);
        }).catch(function (err) {
          console.log('Query to check whether table ' + table + ' exists failed');
          reject(err);
        });
      }
    });
  }

  // Execute all functions in the array serially
  async _switchSystemVersioningOff(table) {
    await new Promise(async (resolve, reject) => {
      this.knex.raw('ALTER TABLE dbo.' + table + ' SET (SYSTEM_VERSIONING = OFF)').then(function () {
        console.log('System versioning switched OFF for table ' + table);
        resolve();
      }).catch(function (err) {
        if (err.number === 13591) {
          // ignore error when system versioning is not turned on
          resolve();
        } else {
          console.log('Switching system versioning off failed for table ' + table);
          reject(err);
        }
      });
    });
  }

  async _switchSystemVersioningOn(table) {
    await new Promise(async (resolve, reject) => {
      this.knex.raw('ALTER TABLE dbo.' + table +
        ' ADD SysStartTime datetime2 GENERATED ALWAYS AS ROW START NOT NULL, SysEndTime datetime2 GENERATED ALWAYS AS ROW END NOT NULL, PERIOD FOR SYSTEM_TIME (SysStartTime,SysEndTime)').then(
        function () {
          console.log('System versioning switched ON for table ' + table);
          resolve();
        }).catch(function (err) {
        console.log('altering table ' + table + ' failed');
        reject(err);
      });
    });
  }

  async _dropAll(tables) {
    if (!_.isArray(tables)) {
      throw new Error("tables argument must be an array with table names");
    }

    for (const table of tables) {
      try {
        const exists = await this._existsTable(table);
        if (exists) {
          await new Promise(async (resolve, reject) => {
            let dropSQL;
            if (this.#dbClient === 'sqlite3') {
              dropSQL = 'DROP TABLE ' + table;
            } else {
              dropSQL = 'DROP TABLE dbo.' + table;
            }
            this.knex.raw(dropSQL).then(function () {
              console.log('Table ' + table + ' dropped');
              resolve();
            }).catch(function (err) {
              console.log('dropping table ' + table + ' failed');
              reject(err);
            });
          });
        } else {
          console.log("Table " + table + " not dropping, because it does not exist.");
        }
      } catch (ex) {
        console.log("checking for table " + table + " failed");
        throw ex;
      }
    }
  }

}

Object.assign(DB.prototype, UserDatabaseMixin);

module.exports = DB;
