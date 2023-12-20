import AsRouteConfig from '../as-router.js';

class RoleRouteConfig extends AsRouteConfig {
}

const rc = new RoleRouteConfig();
/* POST create new user */
rc.put('/', (req, res, next) => {
  const db = req.app.get('database');
  const { name } = req.body;
  db.createRoleEmpty(name).then((id) => {
    res.send({ id });
  }).catch((error) => {
    switch(error.cause) {
      case 'exists':
        console.error(error.message);
        res.send(422);
        break;
      default:
        console.error(error);
        res.send(500);
    }
  });
});

rc.get('/', (req, res, next) => {
  const db = req.app.get('database');
  db.getRoles().then((result) => {
    res.send(result);
  }).catch((error) => {
    console.error(error);
    res.send(500);
  });
});

rc.get('/:idRole/permission', (req, res, next) => {
  const { idRole } = req.params;
  if (idRole === undefined) {
    res.send(404);
    return;
  }
  const db = req.app.get('database');
  db.getPermissionsForRole(idRole).then((result) => {
    res.send(result);
  }).catch((error) => {
    console.error(error);
    res.send(500);
  });
});

export default rc;
