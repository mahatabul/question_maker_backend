const User = require("../models/user");

const transactionMiddleware = (cost) => {
  return async (req, res, next) => {
    const user = await User.findById(req.user.userId);

    if (user.credits < cost) {
      return res.status(400).json({ msg: "Not enough credits" });
    }
    next();
  };
};

module.exports = transactionMiddleware;
