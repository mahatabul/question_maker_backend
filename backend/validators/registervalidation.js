const Joi = require("joi");

const registerschema = Joi.object({
  username: Joi.string().min(3).max(6).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid("student", "teacher").required(),
}).unknown(false);

const registervalidation = (req, res, next) => {
  const { error } = registerschema.validate(req.body);
  if (error) {
    return res.status(400).json({
      msg: error.details[0].message,
    });
  }
  next();
};

module.exports = registervalidation;
