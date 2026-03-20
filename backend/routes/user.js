const {
  login,
  register,
  verifyUser,
  getprofile,
  forgotPassword,
  resetPassword,
} = require("../controllers/user");

const express = require("express");
const router = express.Router();
const authmiddleware = require("../middleware/auth");
const verifyResetToken = require("../middleware/verifyResetTokenMiddleware");

router.route("/login").get(login);
router.route("/register").post(register);
router.route("/verify/:token").get(verifyUser);
router.route("/getprofile").get(authmiddleware, getprofile);

router.route("/reset-password/:token").post(verifyResetToken, resetPassword);
router.route("forgot-password").post(forgotPassword);

module.exports = router;
