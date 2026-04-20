const mongoose = require("mongoose");
const User = require("../models/user");
const { StatusCodes } = require("http-status-codes");
const Transaction = require("../models/transaction");

const recharge = async (req, res) => {
  const { amount } = req.body;
  const max_credit = Number(process.env.MAX_CREDIT);

  if (!amount || amount <= 0) {
    return res.status(StatusCodes.BAD_REQUEST).json({ msg: "Invalid recharge amount" });
  }

  try {
    // 1. Get current user data (to check limit)
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({ msg: "User not found" });
    }

    // 2. Validate credit limit
    const newCredits = user.credits + amount;
    if (newCredits > max_credit) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        msg: `Cannot add ${amount} credits. Maximum allowed is ${max_credit}. You currently have ${user.credits} credits.`
      });
    }

    // 3. Update credits atomically
    const updatedUser = await User.findByIdAndUpdate(
      req.user.userId,
      { $inc: { credits: amount } },
      { new: true, runValidators: true }
    );

    // 4. Record transaction
    await Transaction.create({
      user: updatedUser._id,
      amount: amount,
      type: "credit",
      reason: "credit recharge",
    });

    res.status(StatusCodes.OK).json({
      msg: "Recharge successful",
      credits: updatedUser.credits,
    });
  } catch (error) {
    console.error(error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      msg: error.message,
    });
  }
};
const balance = async (req, res) => {
  const user = await User.findById(req.user.userId).select("credits");

  if (!user) {
    return res.status(StatusCodes.NOT_FOUND).json({
      msg: "User not found",
    });
  }

  res.status(StatusCodes.OK).json({
    credits: user.credits,
  });
};

const history = async (req, res) => {
  const transactions = await Transaction.find({
    user: req.user.userId,
  }).sort({ createdAt: -1 });

  res.status(StatusCodes.OK).json({
    count: transactions.length,
    transactions,
  });
};



module.exports = { recharge, balance, history };
