const { StatusCodes } = require("http-status-codes");
const User = require("../models/user");
const jwt = require("jsonwebtoken");
const bcryptjs = require("bcryptjs");
const sendEmail = require("../utils/sendEmail");

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

  res.status(StatusCodes.OK).json({ token: token, email: user.email });
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

module.exports = { login, register, verifyUser, getprofile };
