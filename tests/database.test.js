import { DateTime } from 'luxon';
import _ from 'lodash';
import { expect } from 'chai';
import DB from '../lib/database.js';
import AsExpress from '../lib/as-express.js';
import config from '../lib/config.js';

const dbSchema = {
  version: 1,
  name: 'test',
  tables: [
    {
      tableName: 'Test1',
      columns: [
        {
          name: 'id',
          type: 'autoincrement',
          primary_key: true,
        },
        {
          name: 'TestUniqueString',
          type: 'string',
          unique: true,
          nullable: false,
        },
      ],
    },
  ],
};

const permissions = {
  test1_list_read: {
    description: 'TestUniqueString anzeigen',
    resources: ['/api/v1/gattung'],
    methods: ['get'],
    menus: ['admin.gattungen'],
  },
  test1_create: {
    description: 'Neuen TestUniqueString anlegen',
    resources: ['/api/v1/gattung'],
    methods: ['put'],
    menus: ['admin.gattung'],
  },
  test1_read: {
    description: 'TestUniqueString anzeigen',
    resources: ['/api/v1/gattung/:id'],
    methods: ['get'],
    menus: ['admin.gattung'],
  },
  test1_update: {
    description: 'TestUniqueString ändern',
    resources: ['/api/v1/gattung/:id'],
    methods: ['get', 'post'],
    menus: ['admin.gattung'],
  },
  test1_delete: {
    description: 'TestUniqueString löschen',
    resources: ['/api/v1/gattung/:id'],
    methods: ['delete'],
    menus: ['admin.gattung'],
  },
};

class App {
  #kv = {};

  use() {
  }

  set(k, v) {
    this.#kv[k] = v;
  }
}

config.dataDirectory = '.';
config.initialAdminPassword = 'this is just an example';

const app = new App();

const asExpress = new AsExpress('as-express-test', app);

after(() => {
  console.log('Testing finished. Terminating http server');
  asExpress.terminateHttpServer();
});

describe('Testing the Database Functions', () => {
  let db;
  let existingUserIds = [];
  const usersToDelete = [];
  let oldPw; let newPw; let
    userId;

  it('asExpress.init', async () => {
    await asExpress.init({
      dbSchemas: [dbSchema],
      permissions,
      dropTables: true, // for testing start with empty DB
    });
  });

  it('creating db instance', (done) => {
    db = new DB({ appName: asExpress.appName });
    expect(db).to.not.be.undefined;
    done();
  });

  it('reading already existing users', async () => {
    existingUserIds = _.map(await db.getUser(), (user) => user.id);
  });

  it('creating users', async () => {
    userId = await db.createUser('joe@example.com', 'honk123;Z');
    expect(userId).to.not.be.undefined;
    expect(userId).to.be.a('number');
    oldPw = '93h8tgqi';
    userId = await db.createUser('joe@example.com', oldPw);
    usersToDelete.push(userId);
    expect(userId).to.not.be.undefined;
    expect(userId).to.be.a('number');
  });

  it('set EmailConfirmed to true and try creating user with same email again, which must fail', async () => {
    await db.updateUserById(userId, { EmailConfirmed: true });

    let ok;
    try {
      const userId = await db.createUser('joe@example.com', '98igoauhg9');
      ok = false; // must not come here, because the createUser call must throw an exception
    } catch (ex) {
      ok = ex.cause === 'exists';
    }
    expect(ok).to.be.true;
  });

  it('update password and try login', async () => {
    let ok;
    newPw = '&lg652!2dg';
    await db.updateUserById(userId, { Password: newPw });
    try {
      await db.validateUser('joe@example.com', oldPw);
      ok = false; // must not come here, because it is expected that validateUser fails due to wrong pw
    } catch (ex) {
      ok = ex.cause === 'invalid';
    }
    expect(ok).to.be.true;

    try {
      await db.validateUser('joe@example.com', newPw);
      ok = true; // must come here, because it is expected that validateUser succeeds with correct
    } catch (ex) {
      ok = false; // must not fail with wrong password or any other error
    }
    expect(ok).to.be.true;
  });

  it('update expiration date and try login', async () => {
    let ok;
    // check expired user fails validation
    await db.updateUserByEmail('joe@example.com', { ExpiredAfter: DateTime.now().minus({ minutes: 1 }) });
    try {
      await db.validateUser('joe@example.com', newPw);
      ok = false; // Validation did not fail for expired user
    } catch (reason) {
      ok = reason.cause === 'expired';
    }
    expect(ok).to.be.true;
  });

  it('Check getUserByEmail', async () => {
    userId = await db.createUser('nick@example.com', 'lagrjpoa@gagj');
    usersToDelete.push(userId);
    const u2 = await db.getUserByEmail('joe@example.com');
    expect(u2).to.not.be.undefined;
    expect(u2.Email).to.equal('joe@example.com');
    expect(u2.EmailConfirmed).to.equal(true);
    expect(u2.PasswordSalt).to.not.be.undefined;
    expect(u2.PasswordSalt).to.not.equal('');

    const u3 = await db.getUserByEmail('nick@example.com');
    expect(u3).to.not.be.undefined;
    expect(u3.Email).to.equal('nick@example.com');
    expect(u3.PasswordSalt).to.not.be.undefined;
    expect(u3.PasswordSalt).to.not.equal('');
    expect(u2.PasswordSalt).to.not.equal(u3.PasswordSalt);

    const u3b = await db.getUserById(userId);
    expect(u3b).to.not.be.undefined;
    expect(u3b.Email).to.equal('nick@example.com');
  });

  it('Check deleteUsers', async () => {
    userId = await db.createUser('Karin@example.com', 'Karin Nubrowski');
    usersToDelete.push(userId);
    userId = await db.createUser('jeff@example.com', 'Jeff Amazini');
    usersToDelete.push(userId);
    const u3d = await db.deleteUsers([usersToDelete[0]]);
    expect(u3d).to.equal(1);
    const u3dd = await db.deleteUsers(usersToDelete);
    expect(u3dd).to.equal(3);
    const leftUsers = await db.getUser();
    const leftUsersIds = _.map(leftUsers, (user) => user.id);

    const difference = existingUserIds.filter((x) => !leftUsersIds.includes(x));
    expect(difference.length).to.equal(0);
  });
});
