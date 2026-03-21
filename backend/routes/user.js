const {
  login,
  register,
  verifyUser,
  getprofile,
  forgotPassword,
  resetPassword,
} = require("../controllers/user");

const { loginvalidation, registervalidation } = require("../validators");

const express = require("express");
const router = express.Router();
const authmiddleware = require("../middleware/auth");
const verifyResetToken = require("../middleware/verifyResetTokenMiddleware");

router.route("/login").get(loginvalidation, login);
router.route("/register").post(registervalidation, register);
router.route("/verify/:token").get(verifyUser);
router.route("/getprofile").get(authmiddleware, getprofile);

router.route("/reset-password/:token").post(verifyResetToken, resetPassword);
router.route("/forgot-password").post(forgotPassword);

module.exports = router;
