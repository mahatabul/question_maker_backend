const Joi = require("joi");

const resetPasswordschema = Joi.object({
  newPassword: Joi.string().min(6).required(),
}).unknown(false);

const resetPasswordvalidation = (req, res, next) => {
  const { error } = resetPasswordschema.validate(req.body);
  if (error) {
    return res.status(400).json({
      msg: error.details[0].message,
    });
  }
  next();
};

module.exports = resetPasswordvalidation;
