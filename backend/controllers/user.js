const { StatusCodes } = require("http-status-codes");
const User = require("../models/user");
const jwt = require("jsonwebtoken");
const bcryptjs = require("bcryptjs");
const sendEmail = require("../utils/sendEmail");
const getDelay = require("../utils/delay");
const crypto = require("crypto");

const createToken = (user, expiry) => {
  const token = jwt.sign(
    { userId: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: expiry },
  );
  return token;
};

const login = async (req, res) => {
  const { username, password, rememberMe } = req.body;

  const user = await User.findOne({ username }).select("+password");

  if (!user) {
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json({ msg: "Invalid credentials" });
  }

  if (user.failedloginattemps > 0 && user.lastLoginfail) {
    const delay = getDelay(user.failedloginattemps);
    const timePassed = Math.ceil(Date.now() - user.lastLoginfail.getTime());

    if (delay > timePassed) {
      const wait = Math.ceil((delay - timePassed) / 1000);
      return res.status(StatusCodes.TOO_MANY_REQUESTS).json({
        msg: `Too many attempts. Try again in ${wait}s`,
      });
    }


  }

  const isMatch = await bcryptjs.compare(password, user.password);

  if (!isMatch) {
    user.failedloginattemps += 1;
    user.lastLoginfail = new Date();

    await user.save();
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json({ msg: "Invalid credentials" });
  }

  user.failedloginattemps = 0;
  user.lastLoginfail = undefined;

  await user.save();

  if (!user.isVerified) {
    return res.status(403).json({
      msg: "Account not verified. Please check your email to verify",
    });
  }

  const expiry = rememberMe ? '30d' : process.env.JWT_LIFETIME;
  const token = createToken(user, expiry);

  res.status(StatusCodes.OK).json({ msg: "Login Successfull", token: token });
};

const register = async (req, res) => {
  const { username, email, password, role } = req.body;

  const user = await User.create({ username, email, password, role });

  const temptoken = createToken(user, process.env.JWT_TEMP);

  const verification_link = `${process.env.FRONTEND_URL}/verify/${temptoken}`;

  await sendEmail({
    to: user.email,
    subject: "Verify your account",
    html: `
    <div>
      <h2>Welcome to Question Maker!</h2>
      <p>Please click the link below to verify your email:</p>
      <a href="${verification_link}">Verify Email</a>
      <p>This link will expire in 24 hours.</p>
    </div>
  `,
  });

  res.status(StatusCodes.CREATED).json({
    msg: "user created. verfication link sent",
  });
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

const forgotPassword = async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    return res.status(StatusCodes.NOT_FOUND).json({ msg: "User not found" });
  }

  // Generate 6-digit PIN code
  const pinCode = Math.floor(100000 + Math.random() * 900000).toString();

  // Hash the PIN for storage
  const hashedPIN = crypto
    .createHash("sha256")
    .update(pinCode)
    .digest("hex");

  // Store hashed PIN and expiry
  user.passwordResetPIN = hashedPIN;
  user.passwordResetPINExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

  // Clear any existing reset tokens
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  await user.save();

  // Send PIN via email
  await sendEmail({
    to: user.email,
    subject: "Password Reset PIN Code",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>You requested to reset your password. Here is your PIN code:</p>
        <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; letter-spacing: 5px; font-weight: bold; border-radius: 8px;">
          ${pinCode}
        </div>
        <p>This PIN will expire in 10 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <hr style="margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">This is an automated message, please do not reply.</p>
      </div>
    `,
  });

  res.status(StatusCodes.OK).json({
    msg: "PIN code sent to your email",
    email: user.email // Send email back to frontend for verification step
  });
};

const resetPassword = async (req, res) => {
  const { newPassword, confirmNewPassword } = req.body;
  const user = req.resetUser;

  // Check if passwords match
  if (newPassword !== confirmNewPassword) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      msg: "Passwords do not match"
    });
  }

  // Validate password strength
  if (newPassword.length < 6) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      msg: "Password must be at least 6 characters long"
    });
  }


  user.password = newPassword;


  user.passwordResetPIN = undefined;
  user.passwordResetPINExpires = undefined;

  await user.save();

  // Send confirmation email
  try {
    await sendEmail({
      to: user.email,
      subject: "Password Changed Successfully",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Changed</h2>
          <p>Your password has been successfully changed.</p>
          <p>If you didn't make this change, please contact support immediately.</p>
        </div>
      `,
    });
  } catch (emailError) {
    console.error("Failed to send confirmation email:", emailError);
  }

  res.status(StatusCodes.OK).json({
    msg: "Password reset successful! You can now login with your new password."
  });
};

const changePassword = async (req, res) => {
  const { currentPassword, newPassword, confirmNewPassword } = req.body;
  const userId = req.user.userId;

  if (newPassword !== confirmNewPassword) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      msg: "New passwords do not match"
    });
  }

  if (newPassword.length < 6) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      msg: "Password must be at least 6 characters long"
    });
  }

  const user = await User.findById(userId).select("+password");
  if (!user) {
    return res.status(StatusCodes.NOT_FOUND).json({
      msg: "User not found"
    });
  }

  const isPasswordCorrect = await bcryptjs.compare(currentPassword, user.password);
  if (!isPasswordCorrect) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      msg: "Current password is incorrect"
    });
  }

  const isSamePassword = await bcryptjs.compare(newPassword, user.password);
  if (isSamePassword) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      msg: "New password must be different from current password"
    });
  }

  user.password = newPassword;
  await user.save();

  try {
    await sendEmail({
      to: user.email,
      subject: "Password Changed",
      html: "<p>Your password has been changed successfully.</p>"
    });
  } catch (emailError) {
    console.error("Failed to send email notification:", emailError);
  }

  res.status(StatusCodes.OK).json({
    msg: "Password changed successfully"
  });
};

module.exports = {
  login,
  register,
  verifyUser,
  getprofile,
  forgotPassword,
  resetPassword,
  changePassword,

};
