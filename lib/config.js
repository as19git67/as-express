const yaml = require('js-yaml');
const fs = require('fs');
const _ = require('lodash');

let settings = yaml.load(fs.readFileSync('settings.yaml', 'utf8'));

let config = {};
_.defaults(config, settings,{
  "httpPort": 3000,
  "dbHost": "127.0.0.1",
  "dbName": "ascloudsql",
  "dbUsername": "somebody",
  "dbPassword": "secret",
  "dbDebug": false,
  "adminUser": "admin",
  "initialAdminPassword": "secret",
  "tokenLifetime": '600'
});

module.exports = config;
