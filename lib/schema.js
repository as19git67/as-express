const schema = [
  {
    "tableName": "Roles",
    "columns": [
      {
        "name": "id",
        "type": "autoincrement",
        "primary_key": true,
      },
      {
        "name": "Name",
        "type": "string",
        "unique": true,
        "nullable": false,
      },
    ],
  },
  {
    "tableName": "RolePermissions",
    "columns": [
      {
        "name": "id",
        "type": "autoincrement",
        "primary_key": true,
      },
      {
        "name": "idRole",
        "type": "integer",
        "nullable": false,
      },
      {
        "name": "Resource",
        "type": "string",
        "nullable": false,
      },
      {
        "name": "Permission",
        "type": "string",
        "length": 6,
        "nullable": false,
      },
    ],
    "indexes": [
      {
        "name": "IDX_idRole_Resource_Permission",
        "columns": ["idRole", "Resource", "Permission"],
        "unique": true
      }
    ],
    "foreign_keys": [
      {
        "name": "FK_idRole__Roles_id",
        "columns": ["idRole"],
        "foreign_table": "Roles",
        "foreign_columns": ["id"],
      }
    ],
  },
  {
    "tableName": "Users",
    "columns": [
      {
        "name": "id",
        "type": "autoincrement",
        "primary_key": true,
      },
      {
        "name": "Username",
        "type": "string",
        "unique": true,
        "nullable": false,
      },
      {
        "name": "Initials",
        "type": "string",
        "length": 2,
      },
      {
        "name": "PasswordSalt",
        "type": "string",
        "nullable": false,
      },
      {
        "name": "PasswordHash",
        "type": "string",
        "nullable": false,
      },
    ],
  },
  {
    "tableName": "UserAccessTokens",
    "columns": [
      {
        "name": "id",
        "type": "autoincrement",
        "primary_key": true,
      },
      {
        "name": "idUser",
        "type": "integer",
        "nullable": false,
      },
      {
        "name": "AccessToken",
        "type": "string",
        "nullable": false,
        "unique": true
      },
      {
        "name": "RefreshToken",
        "type": "string",
        "nullable": false,
        "unique": true
      },
      {
        "name": "ExpiredAfter",
        "type": "dateTime",
        "nullable": false,
      },
    ],
    "indexes": [
      {
        "name": "IDX_UserAccessTokens_ExpiredAfter",
        "columns": ["ExpiredAfter"],
        "unique": false
      }
    ],
    "foreign_keys": [
      {
        "name": "FK_idUser__Users_id",
        "columns": ["idUser"],
        "foreign_table": "Users",
        "foreign_columns": ["id"],
      }
    ],
  }

];

module.exports = schema;
