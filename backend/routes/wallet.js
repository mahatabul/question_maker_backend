const express = require("express");
const router = express.Router();
const authmiddleware = require("../middleware/auth");
const isAdmin = require("../middleware/isAdmin");
const {
  balance,
  history,
  createRechargeRequest,
  getUserRechargeRequests,
  getAllRechargeRequests,
  processRechargeRequest,
} = require("../controllers/wallet");

// User routes
// router.route("/recharge").post(authmiddleware, recharge);
router.route("/balance").get(authmiddleware, balance);
router.route("/history").get(authmiddleware, history);

// Recharge request routes (user)
router.post("/recharge-request", authmiddleware, createRechargeRequest);
router.get("/recharge-requests", authmiddleware, getUserRechargeRequests);

// Admin only routes
router.get("/admin/recharge-requests", authmiddleware, isAdmin, getAllRechargeRequests);
router.put("/admin/recharge-request/:id", authmiddleware, isAdmin, processRechargeRequest);

module.exports = router;