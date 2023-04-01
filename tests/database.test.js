import DB from '../lib/database.js';
import AsExpress from '../lib/as-express.js';
import {DateTime} from "luxon";
import _ from "lodash";
import {expect} from 'chai';

const dbSchema = [
  {
    "tableName": "Test1",
    "columns": [
      {
        "name": "id",
        "type": "autoincrement",
        "primary_key": true,
      },
      {
        "name": "TestUniqueString",
        "type": "string",
        "unique": true,
        "nullable": false,
      },
    ],
  },
];

const permissions = {
  test1_list_read: {
    description: "TestUniqueString anzeigen",
    resources: ["/api/v1/gattung"],
    permissions: ["get"],
    menus: ["admin.gattungen"]
  },
  test1_create: {
    description: "Neuen TestUniqueString anlegen",
    resources: ["/api/v1/gattung"],
    permissions: ["put"],
    menus: ["admin.gattung"]
  },
  test1_read: {
    description: "TestUniqueString anzeigen",
    resources: ["/api/v1/gattung/:id"],
    permissions: ["get"],
    menus: ["admin.gattung"]
  },
  test1_update: {
    description: "TestUniqueString ändern",
    resources: ["/api/v1/gattung/:id"],
    permissions: ["get", "post"],
    menus: ["admin.gattung"]
  },
  test1_delete: {
    description: "TestUniqueString löschen",
    resources: ["/api/v1/gattung/:id"],
    permissions: ["delete"],
    menus: ["admin.gattung"]
  },
}

class App {
  #kv = {};

  use() {
  }

  set(k, v) {
    this.#kv[k] = v;
  }
}

const app = new App();

const asExpress = new AsExpress('as-express-test', app);

after(function(){
  console.log('Testing finished. Terminating http server');
  asExpress.terminateHttpServer();
});

describe('Testing the Database Functions', function() {


  let db;
  let existingUserIds = [];
  const usersToDelete = [];
  let oldPw, newPw, userId;

  it('Initializing AsExpress', async function () {
    await asExpress.init({
      dbSchema: dbSchema,
      permissions: permissions,
    });
  });

  it('creating db instance', function (done) {
    db = new DB({appName: asExpress.appName});
    expect(db).to.not.be.undefined;
    done();
  });

  it('reading already existing users', async function () {
    existingUserIds = _.map(await db.getUser(), (user)=> {
      return user.id;
    });
  });

  it('creating users', async function () {
    userId = await db.createUser('joe@example.com', 'honk123;Z');
    expect(userId).to.not.be.undefined;
    expect(userId).to.be.a('number')
    oldPw = '93h8tgqi';
    userId = await db.createUser('joe@example.com', oldPw);
    usersToDelete.push(userId);
    expect(userId).to.not.be.undefined;
    expect(userId).to.be.a('number')
  });

  it('set EmailConfirmed to true and try creating user with same email again, which must fail', async function () {
    await db.updateUserById(userId, {EmailConfirmed: true})

    let ok;
    try {
      const userId = await db.createUser('joe@example.com', '98igoauhg9');
      ok = false; // must not come here, because the createUser call must throw an exception
    } catch(ex) {
      ok = ex.cause === 'exists';
    }
    expect(ok).to.be.true;
  });

  it('update password and try login', async function () {
    let ok;
    newPw = '&lg652!2dg';
    await db.updateUserById(userId, {Password: newPw});
    try {
      await db.validateUser('joe@example.com', oldPw);
      ok = false; // must not come here, because it is expected that validateUser fails due to wrong pw
    } catch(ex) {
      ok = ex.cause === 'invalid';
    }
    expect(ok).to.be.true;

    try {
      await db.validateUser('joe@example.com', newPw);
      ok = true; // must come here, because it is expected that validateUser succeeds with correct
    } catch(ex) {
        ok = false; // must not fail with wrong password or any other error
    }
    expect(ok).to.be.true;
  });

  it('update expiration date and try login', async function () {
    let ok;
    // check expired user fails validation
    await db.updateUserByEmail('joe@example.com', {ExpiredAfter: DateTime.now().minus({'minutes': 1})});
    try {
      await db.validateUser('joe@example.com', newPw);
      ok = false; // Validation did not fail for expired user
    } catch(reason) {
      ok = reason.cause === 'expired';
    }
    expect(ok).to.be.true;
  });

  it('Check getUserByEmail', async function () {
    userId = await db.createUser('nick@example.com', 'lagrjpoa@gagj');
    usersToDelete.push(userId);
    const u2 = await db.getUserByEmail('joe@example.com');
    expect(u2).to.not.be.undefined;
    expect(u2.Email).to.equal('joe@example.com');
    expect(u2.EmailConfirmed).to.equal(1);
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

  it('Check deleteUsers', async function () {
    userId = await db.createUser('Karin@example.com', 'Karin Nubrowski');
    usersToDelete.push(userId);
    userId = await db.createUser('jeff@example.com', 'Jeff Amazini');
    usersToDelete.push(userId);
    const u3d = await db.deleteUsers([usersToDelete[0]]);
    expect(u3d).to.equal(1);
    const u3dd = await db.deleteUsers(usersToDelete);
    expect(u3dd).to.equal(3);
    const leftUsers = await db.getUser();
    const leftUsersIds = _.map(leftUsers, (user)=> {
      return user.id;
    });

    let difference = existingUserIds.filter(x => !leftUsersIds.includes(x));
    expect(difference.length).to.equal(0);
  });

});

