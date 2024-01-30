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
    console.log('Request does not have role id in the URL');
    res.send(400);
    return;
  }
  const { permissionProfileIds } = req.body;
  if (permissionProfileIds === undefined || !_.isArray(permissionProfileIds)) {
    console.log('Request body does not have permissionProfileIds specified.');
    res.send(400);
    return;
  }

  const db = req.app.get('database');
  db.setPermissionProfileAssignmentsForRole(idRole, permissionProfileIds).then((result) => {
    res.send(result);
  }).catch((error) => {
    console.error(error);
    res.send(500);
  });
});

export default rc;
