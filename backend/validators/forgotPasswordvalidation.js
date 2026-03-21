const Joi = require("joi");

const forgotPasswordschema = Joi.object({
  username: Joi.string().min(3).max(6).required(),
  password: Joi.string().min(6).required(),
}).unknown(false);

const forgotPasswordvalidation = (req, res, next) => {
  const { error } = forgotPasswordschema.validate(req.body);
  if (error) {
    return res.status(400).json({
      msg: error.details[0].message,
    });
  }
  next();
};

module.exports = forgotPasswordvalidation;
