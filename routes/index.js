var express = require('express');
var router = express.Router();

/* GET home page. */
router.get("/", function(req, res, next) {
  res.render("index", { title: "Welcome to Chenxuan's Personal Website!" });
});

router.get("/about", function(req, res, next) {
  res.render("about", { title: "About - Chenxuan's Personal Website!" });
});

router.get("/gallery", function(req, res, next) {
  res.render("gallery", { title: "Gallery - Chenxuan's Personal Website!" });
});

router.get("/donation", function(req, res, next) {
  res.render("donation", { title: "Donation - Chenxuan's Personal Website!" });
});

module.exports = router;
