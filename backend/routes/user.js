const {
  login,
  register,
  verifyUser,
  getprofile,
} = require("../controllers/user");

const express = require("express");
const router = express.Router();
const authmiddleware = require("../middleware/auth");

router.route("/login").get(login);
router.route("/register").post(register);
router.route("/verify/:token").get(verifyUser);
router.route("/getprofile").get(authmiddleware, getprofile);

module.exports = router;
