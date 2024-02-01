const schema = {
  version: 7,
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
          name: 'FK_idRole__Roles_id',
          columns: ['idRole'],
          foreign_table: 'Roles',
          foreign_columns: ['id'],
        },
        // {
        //   name: 'FK_idPermissionProfile__PermissionProfiles_idPermissionProfile',
        //   columns: ['idPermissionProfile'],
        //   foreign_table: 'PermissionProfiles',
        //   foreign_columns: ['idPermissionProfile'],
        // },
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
          name: 'idPermissionProfile',
          type: 'string',
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
          name: 'IDX_idPermissionProfile_Resource_Method',
          columns: ['idPermissionProfile', 'Resource', 'Method'],
          unique: true,
        },
        {
          name: 'IDX_Resource_Method',
          columns: ['Resource', 'Method'],
          unique: false,
        },
      ],
      foreign_keys: [
        {
          name: 'FK_Permission__PermissionProfile',
          columns: ['idPermissionProfile'],
          foreign_table: 'PermissionProfiles',
          foreign_columns: ['idPermissionProfile'],
        },
      ],
    },
    {
      tableName: 'MenuPermission',
      columns: [
        {
          name: 'idPermissionProfile',
          type: 'string',
          nullable: false,
        },
        {
          name: 'Menu',
          type: 'string',
          nullable: false,
        },
      ],
      indexes: [
        {
          name: 'IDX_idPermissionProfile_Menu',
          columns: ['idPermissionProfile', 'Menu'],
          unique: true,
        },
      ],
      foreign_keys: [
        {
          name: 'FK_MenuPermission__PermissionProfile',
          columns: ['idPermissionProfile'],
          foreign_table: 'PermissionProfiles',
          foreign_columns: ['idPermissionProfile'],
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
