const mongoose = require("mongoose");
const User = require("../models/user");
const Transaction = require("../models/transaction");

const useCredits = (cost, reason) => {
  return async (req, res, next) => {
    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      const user = await User.findById(req.user.userId).session(session);

      if (!user) {
        throw new Error("User not found");
      }

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
            reason: reason,
          },
        ],
        { session }
      );

      await session.commitTransaction();
      session.endSession();

      // pass updated user if needed
      req.updatedCredits = user.credits;

      next();

    } catch (err) {
      await session.abortTransaction();
      session.endSession();

      return res.status(400).json({
        msg: err.message,
      });
    }
  };
};

module.exports = useCredits;