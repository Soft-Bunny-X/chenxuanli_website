var express = require('express');
var router = express.Router();
const user_controller = require("../controllers/userController");
const gallery_controller = require("../controllers/galleryController");

/* GET users listing. */
router.get("/", user_controller.user_get);

router.get("/main/:userID", user_controller.user_main_get);

router.get("/log-out", user_controller.user_log_out_get);

router.get("/sign-up", (req, res, next) => {
  res.render("user-sign-up", {title: "Sign Up - Chenxuan's User"});
});

router.post("/sign-up", user_controller.user_sign_up_post);

router.get("/sign-up/verification/:email", (req, res, next) => {
  res.render("user-verify", {title: "Email Verification - Chenxuan's User"});
});

router.post("/sign-up/verification/:email", user_controller.user_sign_up_verification_post);

router.get("/log-in", (req, res, next) => {
  res.render("user-log-in", {title: "Log In - Chenxuan's User"});
});

router.post("/log-in", user_controller.user_log_in_post);

router.get("/recovery", (req, res, next) => {
  res.render("user-recovery", {title: "Account Recovery - Chenxuan's User"});
});

router.post("/recovery", user_controller.user_recovery_post);

// router.get("/recovery/verification/:email", (req, res, next) => {
//   res.render("user-verify", {title: "Email Verification - Chenxuan's User"});
// });

router.get("/recovery/verification/:email", (req, res, next) => {
  res.render("user-verify", {title: "Email Verification - Chenxuan's User"});
});

router.post("/recovery/verification/:email", user_controller.user_recovery_verification_post);

module.exports = router;
