// middleware/isAdmin.js
const { StatusCodes } = require("http-status-codes");

const isAdmin = (req, res, next) => {
  // Assuming req.user.role is set by authmiddleware
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(StatusCodes.FORBIDDEN).json({ msg: "Access denied. Admin only." });
  }
};

module.exports = isAdmin;