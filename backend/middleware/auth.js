const jwt = require("jsonwebtoken");
const { StatusCodes } = require("http-status-codes");

const authmiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer")) {
    return res.status(StatusCodes.UNAUTHORIZED).json({
      msg: "Authorization token not provided",
    });
  }

  const token = authHeader.split(" ")[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      userId: payload.userId,
      role: payload.role,
    };
    next()
  } catch (error) {
    return res.status(StatusCodes.UNAUTHORIZED).json({
      msg: "Authentication invalid"
    });
  }
};

module.exports = authmiddleware;