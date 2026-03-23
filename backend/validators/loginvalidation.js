const Joi = require("joi");

const loginschema = Joi.object({
  username: Joi.string().min(3).max(6).required(),
  password: Joi.string().min(6).required(),
}).unknown(false);

const loginvalidation = (req, res, next) => {
  const { error } = loginschema.validate(req.body);
  if (error) {
    return res.status(400).json({
      msg: error.details[0].message,
    });
  }
  next();
};

module.exports = loginvalidation;
