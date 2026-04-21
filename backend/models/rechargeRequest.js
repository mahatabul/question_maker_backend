const mongoose = require("mongoose");

const rechargeRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    mobileNumber: {
      type: String,
      required: true,
      trim: true,
    },
    transactionId: {
      type: String,
      required: true,
      unique: true, // prevents duplicates
      trim: true,
      uppercase: true,
    },
    paymentMethod: {
      type: String,
      enum: ["bkash", "nagad", "rocket"],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    adminNote: String,
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    processedAt: Date,
  },
  { timestamps: true }
);

const RechargeRequest = mongoose.model("RechargeRequest", rechargeRequestSchema);
module.exports = RechargeRequest