// middleware/verifyPIN.js
const crypto = require("crypto");
const { StatusCodes } = require("http-status-codes");
const User = require("../models/user");

const verifyPIN = async (req, res, next) => {
  const { pin } = req.body;

  if (!pin) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      msg: "PIN code is required"
    });
  }

  // Hash the provided PIN
  const hashedPIN = crypto
    .createHash("sha256")
    .update(pin)
    .digest("hex");

  // Find user with matching PIN that hasn't expired
  const user = await User.findOne({
    passwordResetPIN: hashedPIN,
    passwordResetPINExpires: { $gt: Date.now() },
  });

  if (!user) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      msg: "Invalid or expired PIN code"
    });
  }

  // Attach user to request object
  req.resetUser = user;
  
  next();
};

module.exports = verifyPIN;