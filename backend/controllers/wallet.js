const mongoose = require("mongoose");
const User = require("../models/user");
const { StatusCodes } = require("http-status-codes");
const RechargeRequest = require("../models/rechargeRequest");
const Transaction = require("../models/transaction");

// User submits a recharge request
const createRechargeRequest = async (req, res) => {
  const { amount, mobileNumber, transactionId, paymentMethod } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ msg: "Invalid amount" });
  }
  if (!mobileNumber || !transactionId || !paymentMethod) {
    return res.status(400).json({ msg: "All fields are required" });
  }

  try {
    const existing = await RechargeRequest.findOne({ transactionId });
    if (existing) {
      return res.status(400).json({ msg: "Transaction ID already used" });
    }

    const request = await RechargeRequest.create({
      user: req.user.userId,
      amount,
      mobileNumber,
      transactionId,
      paymentMethod,
      status: "pending",
    });

    res.status(201).json({
      msg: "Recharge request submitted. Will be processed within 1 hour.",
      request,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: error.message });
  }
};

// Get user's own recharge requests
const getUserRechargeRequests = async (req, res) => {
  try {
    const requests = await RechargeRequest.find({ user: req.user.userId }).sort({ createdAt: -1 });
    res.json({ requests });
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
};

// Admin: get all recharge requests (filter by status)
const getAllRechargeRequests = async (req, res) => {
  const { status } = req.query;
  const filter = status ? { status } : {};
  try {
    const requests = await RechargeRequest.find(filter)
      .populate("user", "username email")
      .sort({ createdAt: -1 });
    res.json({ requests });
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
};

// Admin: approve or reject a request
const processRechargeRequest = async (req, res) => {
  const { id } = req.params;
  const { action, adminNote } = req.body;

  if (!["approve", "reject"].includes(action)) {
    return res.status(400).json({ msg: "Invalid action" });
  }

  try {
    const request = await RechargeRequest.findById(id);
    if (!request) return res.status(404).json({ msg: "Request not found" });
    if (request.status !== "pending") {
      return res.status(400).json({ msg: "Request already processed" });
    }

    if (action === "approve") {
      const user = await User.findById(request.user);
      if (!user) return res.status(404).json({ msg: "User not found" });

      const maxCredit = Number(process.env.MAX_CREDIT) || 2000;
      const newCredits = user.credits + request.amount;
      if (newCredits > maxCredit) {
        return res.status(400).json({ msg: `Credit limit would exceed ${maxCredit}` });
      }

      user.credits = newCredits;
      await user.save();

      await Transaction.create({
        user: user._id,
        amount: request.amount,
        type: "credit",
        reason: `Manual recharge approved - ${request.transactionId}`,
      });

      request.status = "approved";
    } else {
      request.status = "rejected";
    }

    request.adminNote = adminNote || "";
    request.processedBy = req.user.userId;
    request.processedAt = new Date();
    await request.save();

    res.json({ msg: `Request ${action}d successfully`, request });
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
};

// Direct recharge (instant, without admin approval)
const recharge = async (req, res) => {
  const { amount } = req.body;
  const maxCredit = Number(process.env.MAX_CREDIT) || 2000;

  if (!amount || amount <= 0) {
    return res.status(StatusCodes.BAD_REQUEST).json({ msg: "Invalid recharge amount" });
  }

  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({ msg: "User not found" });
    }

    const newCredits = user.credits + amount;
    if (newCredits > maxCredit) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        msg: `Cannot add ${amount} credits. Maximum allowed is ${maxCredit}. You currently have ${user.credits} credits.`
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.userId,
      { $inc: { credits: amount } },
      { new: true, runValidators: true }
    );

    await Transaction.create({
      user: updatedUser._id,
      amount,
      type: "credit",
      reason: "credit recharge",
    });

    res.status(StatusCodes.OK).json({
      msg: "Recharge successful",
      credits: updatedUser.credits,
    });
  } catch (error) {
    console.error(error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ msg: error.message });
  }
};

const balance = async (req, res) => {
  const user = await User.findById(req.user.userId).select("credits");
  if (!user) {
    return res.status(StatusCodes.NOT_FOUND).json({ msg: "User not found" });
  }
  res.status(StatusCodes.OK).json({ credits: user.credits });
};

const history = async (req, res) => {
  const transactions = await Transaction.find({ user: req.user.userId }).sort({ createdAt: -1 });
  res.status(StatusCodes.OK).json({
    count: transactions.length,
    transactions,
  });
};

module.exports = {
  recharge,
  balance,
  history,
  createRechargeRequest,
  getUserRechargeRequests,
  getAllRechargeRequests,
  processRechargeRequest,
};