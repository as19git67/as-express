import AsRouteConfig from '../as-router.js';

class RoleRouteConfig extends AsRouteConfig {
}

const rc = new RoleRouteConfig('/:idRole');

/* POST update role name */
rc.post((req, res, next) => {
  const db = req.app.get('database');
  const { name } = req.body;
  db.updateRoleNameById(name).then(() => {
    res.send(200);
  }).catch((error) => {
    switch (error.cause) {
      case 'exists':
        console.error(error.message);
        res.send(422);
        break;
      case 'unknown':
        console.error(error.message);
        res.send(400);
        break;
      default:
        console.error(error);
        res.send(500);
    }
  });
});

export default rc;
