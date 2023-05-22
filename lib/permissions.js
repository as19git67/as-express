const permissions = {
  usermanagement_user_list_read: {
    description: 'Usermangement: Benutzerliste anzeigen',
    resources: ['/api/v1/user'],
    permissions: ['get'],
    menus: ['admin.users'],
  },
  usermanagement_user_create: {
    description: 'Usermangement: neuen Benutzer anlegen',
    resources: ['/api/v1/user'],
    permissions: ['put'],
    menus: ['admin.user', 'admin.users'],
  },
  usermanagement_user_read: {
    description: 'Usermangement: Benutzer anzeigen',
    resources: ['/api/v1/user/:id'],
    permissions: ['get'],
    menus: ['admin.user'],
  },
  usermanagement_user_update: {
    description: 'Usermangement: Benutzer ändern',
    resources: ['/api/v1/user/:id'],
    permissions: ['get', 'post'],
    menus: ['admin.user'],
  },
  usermanagement_user_delete: {
    description: 'Usermangement: Benutzer löschen',
    resources: ['/api/v1/user/:id'],
    permissions: ['delete'],
    menus: ['admin.user'],
  },
  rolemanagement_role_list_read: {
    description: 'Rollenverwaltung: Rollenliste anzeigen',
    resources: ['/api/v1/role'],
    permissions: ['get'],
    menus: ['admin.roles'],
  },
  rolemanagement_role_create: {
    description: 'Rollenverwaltung: neue Rolle anlegen',
    resources: ['/api/v1/role'],
    permissions: ['put'],
    menus: ['admin.role', 'admin.roles'],
  },
  rolemanagement_role_read: {
    description: 'Rollenverwaltung: Rolle anzeigen',
    resources: ['/api/v1/role/:id'],
    permissions: ['get'],
    menus: ['admin.role'],
  },
  rolemanagement_role_update: {
    description: 'Rollenverwaltung: Rolle ändern',
    resources: ['/api/v1/role/:id'],
    permissions: ['get', 'post'],
    menus: ['admin.role', 'admin.roles'],
  },
  rolemanagement_role_delete: {
    description: 'Rollenverwaltung: Rolle löschen',
    resources: ['/api/v1/role/:id'],
    permissions: ['delete'],
    menus: ['admin.role', 'admin.roles'],
  },
};

export default permissions;
