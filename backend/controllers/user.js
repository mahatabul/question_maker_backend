const { StatusCodes } = require("http-status-codes");
const User = require("../models/user");
const jwt = require("jsonwebtoken");
const bcryptjs = require("bcryptjs");
const sendEmail = require("../utils/sendEmail");
const crypto = require("crypto");

const login = async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findOne({ username }).select("+password");

  if (!user) {
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json({ msg: "Invalid Username" });
  }
  const isMatch = await bcryptjs.compare(password, user.password);

  if (!isMatch) {
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json({ msg: "Invalid credentials" });
  }

  if (!user.isVerified) {
    return res.status(403).json({
      msg: "Account not verified. Please check your email to verify",
    });
  }

  const createToken = (user, expiry) => {
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: expiry },
    );
    return token;
  };

  const token = createToken(user, process.env.JWT_LIFETIME);

  res.status(StatusCodes.OK).json({ msg: "Login Successfull", token: token });
};

const register = async (req, res) => {
  const { username, email, password, role } = req.body;

  const user = await User.create({ username, email, password, role });

  const temptoken = jwt.sign(
    { userId: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_TEMP },
  );
  const verification_link = `${process.env.BASE_URL}/api/v1/verify/${temptoken}`;

  await sendEmail({
    to: user.email,
    subject: "Verify your account",
    html: `<p>Here is your link: <a href=${verification_link}>Verification link</a>..</p>`,
  });

  res.status(StatusCodes.CREATED).json({
    msg: "user created. verfication link sent",
  });
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    return res.status(404).json({ msg: "User not found" });
  }

  // 🔐 generate raw token
  const resetToken = crypto.randomBytes(32).toString("hex");

  // 🔐 hash token (store hashed version)
  const hashedToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  user.passwordResetToken = hashedToken;
  user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 min

  await user.save();

  const resetLink = `${process.env.BASE_URL}/api/v1/reset-password/${resetToken}`;

  await sendEmail({
    to: user.email,
    subject: "Reset Password",
    html: `<p>Click <a href="${resetLink}">here</a></p>`,
  });

  res.json({ msg: "Reset link sent" });
};

const verifyUser = async (req, res) => {
  const { token } = req.params;

  const payload = jwt.verify(token, process.env.JWT_SECRET);

  const user = await User.findById(payload.userId);

  if (!user) {
    return res
      .status(StatusCodes.FORBIDDEN)
      .json({ msg: "User does not exist" });
  }

  if (user.isVerified) {
    return res.status(StatusCodes.OK).json({ msg: "User already verified" });
  }

  user.isVerified = true;
  await user.save();

  res.status(StatusCodes.OK).json({ msg: "User verification successful" });
};

const getprofile = async (req, res) => {
  const userId = req.user.userId;

  const user = await User.findById(userId);

  if (!user) {
    return res.status(StatusCodes.NOT_FOUND).json({ msg: "User not found" });
  }

  res.status(StatusCodes.OK).json({ msg: "User found", user: user });
};

const resetPassword = async (req, res) => {
  const { newPassword } = req.body;

  const user = req.resetUser; // already verified

  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(newPassword, salt);

  // ❌ invalidate token (IMPORTANT)
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  await user.save();

  res.json({ msg: "Password reset successful" });
};

module.exports = {
  login,
  register,
  verifyUser,
  getprofile,
  forgotPassword,
  resetPassword,
};
