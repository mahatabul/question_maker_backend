import mongoose from "mongoose";
const User = require("../models/user");
const { StatusCodes } = require("http-status-codes");
const Transaction = require("../models/transaction");

const recharge = async (req, res) => {
  const { amount } = req.body;

  if (!amount || amount <= 0) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ msg: "Invalid recharge amount" });
  }

  const session = await mongoose.startSession();

  try {
    session.startTransaction();
    const user = await User.findById(req.user.userId).session(session);
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({ msg: "User not found" });
    }

    user.credits += amount;
    await user.save({ session });

    await Transaction.create(
      [
        {
          user: user._id,
          amount: amount,
          type: "credit",
          reason: "wallet recharge",
        },
      ],
      { session },
    );

    await session.commitTransaction();
    session.endSession();

    res.status(StatusCodes.OK).json({
      msg: "Recharge successful",
      credits: user.credits,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    res.status(400).json({
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

const useCredits = async (req, res) => {
  const cost = 10;

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const user = await User.findById(req.user.userId).session(session);

    if (user.credits < cost) {
      throw new Error("Not enough credits");
    }

    user.credits -= cost;
    await user.save({ session });

    await Transaction.create(
      [
        {
          user: user._id,
          amount: cost,
          type: "debit",
          reason: "feature usage",
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.json({
      msg: "Credits used",
      remaining: user.credits,
    });

  } catch (err) {
    await session.abortTransaction();
    session.endSession();

    res.status(400).json({ msg: err.message });
  }
};

module.exports = { recharge, balance, history };
