import AsRouteConfig from '../as-router.js';

/* POST authenticate and create new access token */
export default new AsRouteConfig('/').post((req, res, next) => {
  if (req.isAuthenticated()) {
    const db = req.app.get('database');
    db.createAccessTokenForUser(req.user.id).then((tokenData) => {
      console.log('finishing auth post with token');
      res.json(tokenData);
    }).catch((error) => {
      console.error(error);
      res.send(500);
    });
  } else {
    res.send(401);
  }
});
