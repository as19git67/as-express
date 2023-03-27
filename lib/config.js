const yaml = require('js-yaml');
const fs = require('fs');
const _ = require('lodash');

const settingsFilename = 'settings.yaml';
let settings;
try {
  settings = yaml.load(fs.readFileSync(settingsFilename, 'utf8'));
}
catch(ex) {
  console.log(`${ex.message}: can't read ${settingsFilename}. Using defaults only.`);
  settings = {};
}

let config = {};
_.defaults(config, settings,{
  "httpPort": 3000,
  "dbClient": 'sqlite3',
  "dBFilename": './ascloudp.sqlite',
  "dbHost": "127.0.0.1",
  "dbName": "ascloudp",
  "dbUsername": "somebody",
  "dbPassword": "secret",
  "dbDebug": false,
  "adminUser": "admin",
  "initialAdminPassword": "secret",
  "tokenLifetimeInMinutes": '600',
  "express-session-secret": "geheimnis",
  "CORS_origin": true,
});

module.exports = config;
