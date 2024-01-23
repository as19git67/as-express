import AsRouteConfig from '../as-router.js';

class UserRegistrationRouteConfig extends AsRouteConfig {
}

const rc = new UserRegistrationRouteConfig('/');
/* POST create new user */
rc.post((req, res, next) => {
  const db = req.app.get('database');
  const { email } = req.body;
  const { password } = req.body;
  db.createUser(email, password).then(() => {
    res.send();
  }).catch((error) => {
    console.error(error);
    res.send(500);
  });
}, { bypassAuth: true });

rc.get((req, res, next) => {
  const db = req.app.get('database');
  db.getUser().then((result) => {
    res.send(result);
  }).catch((error) => {
    console.error(error);
    res.send(500);
  });
});

export default rc;
