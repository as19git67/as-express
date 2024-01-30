import AsRouteConfig from '../as-router.js';

class PermissionProfilesRouteConfig extends AsRouteConfig {
}

const rc = new PermissionProfilesRouteConfig('/');
rc.get((req, res, next) => {
  const db = req.app.get('database');
  db.getPermissionProfiles().then((result) => {
    res.send(result);
  }).catch((error) => {
    console.error(error);
    res.send(500);
  });
});

export default rc;
