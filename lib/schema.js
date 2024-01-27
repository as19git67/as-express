const schema = {
  version: 4,
  name: 'as-express',
  tables: [
    {
      tableName: 'Roles',
      columns: [
        {
          name: 'id',
          type: 'autoincrement',
          primary_key: true,
        },
        {
          name: 'Name',
          type: 'string',
          unique: true,
          nullable: false,
        },
      ],
    },
    {
      tableName: 'RolePermissions',
      columns: [
        {
          name: 'id',
          type: 'autoincrement',
          primary_key: true,
        },
        {
          name: 'idRole',
          type: 'integer',
          nullable: false,
        },
        {
          name: 'Resource',
          type: 'string',
          nullable: false,
        },
        {
          name: 'Permission',
          type: 'string',
          length: 6,
          nullable: false,
        },
        {
          name: 'Description',
          type: 'string',
          nullable: false,
        },
      ],
      indexes: [
        {
          name: 'IDX_idRole_Resource_Permission',
          columns: ['idRole', 'Resource', 'Permission'],
          unique: true,
        },
      ],
      foreign_keys: [
        {
          name: 'FK_idRole__Roles_id',
          columns: ['idRole'],
          foreign_table: 'Roles',
          foreign_columns: ['id'],
        },
      ],
    },
    {
      tableName: 'RolePermissionProfiles',
      columns: [
        {
          name: 'idRole',
          type: 'integer',
          nullable: false,
        },
        {
          name: 'idPermissionProfile',
          type: 'string',
          nullable: false,
        },
      ],
      indexes: [
        {
          name: 'IDX_idRole_PermissionProfile',
          columns: ['idRole', 'idPermissionProfile'],
          unique: true,
        },
      ],
      foreign_keys: [
        {
          name: 'FK_idRole__PermissionProfile',
          columns: ['idRole'],
          foreign_table: 'PermissionProfile',
          foreign_columns: ['id'],
        },
      ],
    },
    {
      tableName: 'PermissionProfiles',
      columns: [
        {
          name: 'idPermissionProfile',
          type: 'string',
          primary_key: true,
        },
        {
          name: 'Description',
          type: 'string',
          nullable: false,
        },
      ],
    },
    {
      tableName: 'Permission',
      columns: [
        {
          name: 'id',
          type: 'integer',
          nullable: false,
        },
        {
          name: 'Resource',
          type: 'string',
          nullable: false,
        },
        {
          name: 'Method',
          type: 'string',
          length: 6,
          nullable: false,
        },
      ],
      indexes: [
        {
          name: 'IDX_Resource_Method',
          columns: ['Resource', 'Method'],
          unique: true,
        },
      ],
    },
    {
      tableName: 'Users',
      columns: [
        {
          name: 'id',
          type: 'autoincrement',
          primary_key: true,
        },
        {
          name: 'Email',
          type: 'string',
          length: 256,
          unique: true,
          nullable: false,
        },
        {
          name: 'EmailConfirmed',
          type: 'boolean',
          nullable: false,
          default: false,
        },
        {
          name: 'PasswordSalt',
          type: 'string',
          nullable: false,
        },
        {
          name: 'PasswordHash',
          type: 'string',
          nullable: false,
        },
        {
          name: 'ExpiredAfter',
          type: 'dateTime',
          nullable: true,
        },
        {
          name: 'LoginProvider',
          type: 'string',
          length: 128,
          nullable: false,
        },
        {
          name: 'LoginProviderKey',
          type: 'string',
          length: 128,
          nullable: false,
        },
        {
          name: 'Initials',
          type: 'string',
          length: 2,
        },
      ],
    },
    {
      tableName: 'UserAccessTokens',
      columns: [
        {
          name: 'id',
          type: 'autoincrement',
          primary_key: true,
        },
        {
          name: 'idUser',
          type: 'integer',
          nullable: false,
        },
        {
          name: 'AccessToken',
          type: 'string',
          nullable: false,
          unique: true,
        },
        {
          name: 'RefreshToken',
          type: 'string',
          nullable: false,
          unique: true,
        },
        {
          name: 'AccessTokenExpiredAfter',
          type: 'dateTime',
          nullable: false,
        },
      ],
      indexes: [
        {
          name: 'IDX_UserAccessTokens_ExpiredAfter',
          columns: ['AccessTokenExpiredAfter'],
          unique: false,
        },
      ],
      foreign_keys: [
        {
          name: 'FK_idUser__Users_id',
          columns: ['idUser'],
          foreign_table: 'Users',
          foreign_columns: ['id'],
        },
      ],
    },
    {
      tableName: 'UserRoles',
      columns: [
        {
          name: 'id',
          type: 'autoincrement',
          primary_key: true,
        },
        {
          name: 'idUser',
          type: 'integer',
          nullable: false,
        },
        {
          name: 'idRole',
          type: 'integer',
          nullable: false,
        },
      ],
      indexes: [
        {
          name: 'UDX_UserIdRoleId',
          columns: ['idUser', 'idRole'],
          unique: true,
        },
      ],
      foreign_keys: [
        {
          name: 'FK_UserRoles_idUser__Users_id',
          columns: ['idUser'],
          foreign_table: 'Users',
          foreign_columns: ['id'],
        },
        {
          name: 'FK_UserRoles_idRole__Roles_id',
          columns: ['idRole'],
          foreign_table: 'Roles',
          foreign_columns: ['id'],
        },
      ],
    },
    {
      tableName: 'Preferences',
      columns: [
        {
          name: 'id',
          type: 'autoincrement',
          primary_key: true,
        },
        {
          name: 'idUser',
          type: 'integer',
          nullable: false,
        },
        {
          name: 'key',
          type: 'string',
          unique: true,
          nullable: false,
        },
        {
          name: 'description',
          type: 'string',
          unique: false,
          nullable: true,
        },
        {
          name: 'value',
          type: 'text',
          unique: false,
          nullable: true,
        },
      ],
      indexes: [
        {
          name: 'IDX_Preferences_UserKey',
          columns: ['idUser', 'key'],
          unique: true,
        },
      ],
      foreign_keys: [
        {
          name: 'FK_Preferences_idUser__Users_id',
          columns: ['idUser'],
          foreign_table: 'Users',
          foreign_columns: ['id'],
        },
      ],
    },
  ],
};

export default schema;
