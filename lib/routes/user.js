const AsRouteConfig = require("../as-router");

class UserRegistrationRouteConfig extends AsRouteConfig {
  constructor() {
    super();
    this.bypassAuth = true;
  }
}

/* POST create new user */
module.exports = new UserRegistrationRouteConfig().post('/', function (req, res, next) {
  const db = req.app.get('database');
  const email = req.body.email;
  const password = req.body.password;
  db.createUser(email, password).then(result => {
    res.send();
  }).catch(error => {
    console.error(error);
    res.send(500);
  })
});
