const Joi = require("joi");

const resetPasswordschema = Joi.object({
  pin: Joi.string().length(6).pattern(/^\d+$/).required().messages({
    'string.length': 'PIN must be exactly 6 digits',
    'string.pattern.base': 'PIN must contain only numbers',
    'any.required': 'PIN is required'
  }),
  newPassword: Joi.string().min(6).required().messages({
    'string.min': 'Password must be at least 6 characters long',
    'any.required': 'New password is required'
  }),
  confirmNewPassword: Joi.string()
    .valid(Joi.ref('newPassword'))
    .required()
    .messages({
      'any.only': 'Passwords do not match',
      'any.required': 'Please confirm your new password'
    })
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