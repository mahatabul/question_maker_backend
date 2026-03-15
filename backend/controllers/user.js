const { StatusCodes } = require("http-status-codes");
const User = require("../models/user");
const jwt = require("jsonwebtoken");
const bcryptjs = require("bcryptjs");

const login = async (req, res) => {
  const createToken = (user, expiry) => {
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: expiry },
    );
    return token;
  };

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

  const temptoken = createToken(user, process.env.JWT_TEMP);
  const verification_link = `${process.env.BASE_URL}/api/v1/verify/${temptoken}`;

  if (!user.isVerified) {
    return res.status(403).json({
      temptoken: temptoken,
      msg: "Account not verified. Please check your email to verify",
    });
  }

  const token = createToken(user, process.env.JWT_LIFETIME);

  res
    .status(StatusCodes.ACCEPTED)
    .json({token: token, email: user.email });
};

const register = async (req, res) => {
  const { username, email, password, role } = req.body;

  const user = await User.create({ username, email, password, role });

  res.status(StatusCodes.CREATED).send({
    user: {
      username: username,
      password: password,
    },
  });
};

const verifyUser = async (req, res, next) => {
  try {
    const { token } = req.params;

    const payload = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(payload.userId);

    if (!user) {
      return res
        .status(StatusCodes.FORBIDDEN)
        .json({ msg: "User does not exist" });
    }

    if (user.isVerified) {
      return res
        .status(StatusCodes.OK)
        .json({ msg: "User already verified" });
    }

    user.isVerified = true;
    await user.save();

    res
      .status(StatusCodes.OK)
      .json({ msg: "User verification successful" });
  } catch (error) {
    next(error); // send to error handler middleware
  }
};

module.exports = { login, register, verifyUser };
