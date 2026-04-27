const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    method: { type: String },           // bkash, nagad, rocket
    amount: { type: Number },
    from: { type: String },             // sender mobile number
    transactionId: { type: String, required: true, unique: true },
    time: { type: String },             // raw time string from message
    isProcessed: { type: Boolean, default: false },
  },
  { timestamps: true }                  // createdAt used for expiry check
);

module.exports = mongoose.model('Payment', paymentSchema);