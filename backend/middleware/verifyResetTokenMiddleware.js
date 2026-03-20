const crypto = require("crypto");
const { StatusCodes } = require("http-status-codes");
const User = require("../models/user");

const verifyResetToken = async (req, res, next) => {
  try {
    const { token } = req.params;

    // 🔐 hash incoming token
    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    // 🔍 find user with matching token + valid expiry
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ msg: "Invalid or expired token" });
    }

    // ✅ attach user to req
    req.user = {
      userId: user._id,
      role: user.role,
    };

    // also pass full user if needed
    req.resetUser = user;

    next();
  } catch (error) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ msg: "Token verification failed" });
  }
};

module.exports = verifyResetToken;