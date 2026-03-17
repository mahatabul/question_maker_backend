const { recharge, balance, history } = require("../controllers/wallet");

const express = require("express");
const router = express.Router();
const authmiddleware = require("../middleware/auth");

router.route("/recharge").post(authmiddleware, recharge);
router.route("/balance").get(authmiddleware, balance);
router.route("/history").get(authmiddleware, history);

module.exports = router;
