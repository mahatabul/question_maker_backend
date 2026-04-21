const express = require("express");
const router = express.Router();
const authmiddleware = require("../middleware/auth");
const isAdmin = require("../middleware/isAdmin");
const { getAllUsers, getRevenue } = require("../controllers/admin");
const { getAllRechargeRequests, processRechargeRequest } = require("../controllers/wallet");

router.get("/users", authmiddleware, isAdmin, getAllUsers);
router.get("/revenue", authmiddleware, isAdmin, getRevenue);
router.get("/recharge-requests", authmiddleware, isAdmin, getAllRechargeRequests);
router.put("/recharge-request/:id", authmiddleware, isAdmin, processRechargeRequest);

module.exports = router;