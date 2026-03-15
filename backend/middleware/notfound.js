const { StatusCodes } = require('http-status-codes');
const CustomError = require('../utils/error');

const notFound = (req, res, next) => {
  throw new CustomError("Route Not found", StatusCodes.NOT_FOUND);
};

module.exports = notFound;