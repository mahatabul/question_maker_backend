const roleMiddleware = (...roles) => {
  return (req, res, next) => {
    if (!roles.include(req.user.role)) {
      return res.status(403).json({ msg: "Access denied" });
    }
    next();
  };
};

module.exports = roleMiddleware;
