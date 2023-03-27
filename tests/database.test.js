const config = require('../lib/config');
const DB = require('../lib/database');
const AsExpress = require('../lib/as-express');

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

new Promise(async (resolve, reject) => {
  try {
    await asExpress.init({
      dbSchema: dbSchema,
      permissions: permissions,
    });

    console.log('creating user');
    const db = new DB({appName: asExpress.appName});
    const usersToDelete = [];
    let userId = await db.createUser('joe@example.com', 'honk123;Z');
    console.log(`User created with id=${userId}`);
    userId = await db.createUser('joe@example.com', '93h8tgqi');
    console.log(`User created with id=${userId}`);
    usersToDelete.push(userId);
    userId = await db.createUser('nick@example.com', 'lagrjpoa@gagj');
    console.log(`User created with id=${userId}`);
    usersToDelete.push(userId);
    const u2 = await db.getUserByEmail('joe@example.com');
    if (!u2) {
      throw new Error('Created user not returned from database');
    }
    if (u2.Email !== 'joe@example.com') {
      throw new Error('Created user has wrong email in database');
    }
    const u3 = await db.getUserByEmail('nick@example.com');
    if (!u3) {
      throw new Error('Created user not returned from database');
    }
    if (u3.Email !== 'nick@example.com') {
      throw new Error('Created user has wrong email in database');
    }
    const u3b = await db.getUserById(userId);
    if (!u3b) {
      throw new Error('Created user not returned from database');
    }
    if (u3b.Email !== 'nick@example.com') {
      throw new Error('Created user has wrong email in database');
    }
    userId = await db.createUser('Karin@example.com', 'Karin Nubrowski');
    console.log(`User created with id=${userId}`);
    usersToDelete.push(userId);
    userId = await db.createUser('jeff@example.com', 'Jeff Amazini');
    console.log(`User created with id=${userId}`);
    usersToDelete.push(userId);
    const u3d = await db.deleteUsers([usersToDelete[0]]);
    if (u3d !== 1) {
      throw new Error(`Deleting of user with id ${userId} failed`);
    }
    const u3dd = await db.deleteUsers(usersToDelete);
    if (u3dd !== 3) {
      throw new Error(`Deleting of remaining users failed`);
    }



    resolve();
  } catch (ex) {
    reject(ex);
  }
}).then(() => {
  console.log("Database test was successful");
  process.exit(0);
}).catch((reason) => {
  console.log("Database test failed");
  if (reason.data) {
    console.log(reason.data);
  } else {
    console.log(reason);
  }
  process.exit(1);
});
