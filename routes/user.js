var express = require('express');
var router = express.Router();
const user_controller = require("../controllers/userController");
const gallery_controller = require("../controllers/galleryController");

/* GET users listing. */
router.get("/", (req, res, next) => {
  res.render("user", {title: "User Center - Chenxuan's Personal Website"});
});

router.get("/sign-up", (req, res, next) => {
  res.render("user-sign-up", {title: "Sign Up - Chenxuan's User"})
});

router.post("/sign-up", user_controller.user_sign_up_post);

router.get("/sign-up/verification/:email", (req, res, next) => {
  res.render("user-sign-up-verify", {title: "Email Verification - Chenxuan's User"});
});

router.post("/sign-up/verification/:email", user_controller.user_sign_up_verification_post);

router.get("/log-in", (req, res, next) => {
  res.render("user-log-in", {title: "Log In - Chenxuan's User"})
});

router.post("/log-in", user_controller.user_log_in_post);

router.get("/:userID", user_controller.user_main_get);

module.exports = router;
