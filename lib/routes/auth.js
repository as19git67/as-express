const express = require('express');
const router = express.Router();
const passport = require('passport');
const CORS = require('cors');
const config = require('../config');

let corsOptions = {
  origin: config.CORS_origin
};

if (process.env.NODE_ENV === 'DEV') {
  corsOptions = {
    origin: ["http://localhost:3000", "https://localhost:3000"],
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    // allowedHeaders: ['Content-Type', 'Authorization', 'Location'],
    preflightContinue: false,
    optionsSuccessStatus: 204
  };
}

function authenticate(req, res, next) {
  passport.authenticate('basic', {session: false})(req, res, next);
}

/* POST authenticate and create new access token */
router.options('/', CORS()); // enable pre-flight
router.post('/', CORS(), authenticate, function (req, res, next) {
  res.json(req.user);
});

module.exports = router;
