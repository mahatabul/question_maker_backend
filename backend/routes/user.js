const { login, register,verifyUser } = require("../controllers/user");

const express = require("express");
const router = express.Router();

router.route("/login").get(login);
router.route("/register").post(register);
router.route("/verify/:token").get(verifyUser);

module.exports = router;
