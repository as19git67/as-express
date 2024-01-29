import AsRouteConfig from '../as-router.js';
import _ from "lodash";

class RolePermissionProfilesRouteConfig extends AsRouteConfig {
}

const rc = new RolePermissionProfilesRouteConfig('/:idRole/permissionprofile');
rc.get((req, res, next) => {
  const { idRole } = req.params;
  if (idRole === undefined) {
    res.send(404);
    return;
  }
  const db = req.app.get('database');
  db.getPermissionProfilesForRole(idRole).then((result) => {
    res.send(result);
  }).catch((error) => {
    console.error(error);
    res.send(500);
  });
});

rc.post((req, res, next) => {
  const { idRole } = req.params;
  if (idRole === undefined) {
    res.send(404);
    return;
  }
  const { permissionIds } = req.body;
  if (permissionIds === undefined || !_.isArray(permissionIds)) {
    res.send(404);
    return;
  }

  const db = req.app.get('database');
  db.setPermissionProfileAssignmentsForRole(idRole, permissionIds).then((result) => {
    res.send(result);
  }).catch((error) => {
    console.error(error);
    res.send(500);
  });
});

export default rc;
