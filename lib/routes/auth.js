import AsRouteConfig from '../as-router.js';

/* POST authenticate and create new access token */
export default new AsRouteConfig('/').post((req, res, next) => {
  if (req.isAuthenticated()) {
    const db = req.app.get('database');
    const promises = [];
    promises.push(db.createAccessTokenForUser(req.user.id));
    promises.push(db.getUsersPermissions(req.user.id));
    Promise.all(promises).then((results) => {
      console.log('finishing auth post with token');
      const data = results[0]; // tokenData
      // eslint-disable-next-line prefer-destructuring
      data.permissions = results[1];
      res.json(data);
    }).catch((error) => {
      console.error(error);
      res.send(500);
    });
  } else {
    res.send(401);
  }
});
