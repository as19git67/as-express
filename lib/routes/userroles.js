import AsRouteConfig from '../as-router.js';

class UserRoleRouteConfig extends AsRouteConfig {
}

const rc = new UserRoleRouteConfig('/:idUser/roles');

rc.get((req, res, next) => {
  const { idUser } = req.params;
  if (idUser === undefined) {
    res.send(404);
    return;
  }

  const db = req.app.get('database');
  db.getUser(idUser).then((result) => {
    res.send(result);
  }).catch((error) => {
    console.error(error);
    res.send(500);
  });
});

export default rc;
