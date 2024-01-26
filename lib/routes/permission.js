import AsRouteConfig from '../as-router.js';

class PermissionRouteConfig extends AsRouteConfig {
}

const rc = new PermissionRouteConfig('/');
rc.get((req, res, next) => {
  const permissions = req.app.get('permissions');

  const checkHash = {};
  const allPermissions = [];
  const permissionKeys = Object.keys(permissions);
  permissionKeys.forEach((key) => {
    const permissionDef = permissions[key];
    permissionDef.resources.forEach((resource) => {
      permissionDef.permissions.forEach((permission) => {
        const checkKey = `${resource}_${permission}`;
        if (!checkHash[checkKey]) {
          allPermissions.push(
            {
              Resource: resource,
              Permission: permission,
              Description: permissionDef.description,
            },
          );
          checkHash[checkKey] = true;
        }
      });
    });
  });

  res.send(allPermissions);
});

export default rc;
