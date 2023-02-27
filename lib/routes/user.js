const express = require('express');
const router = express.Router();
const CORS = require('cors');

/* POST create new user */
router.options('/', CORS()); // enable pre-flight
router.post('/', CORS(), function(req, res, next) {
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

module.exports = router;
