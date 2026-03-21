const getDelay = (attemps) => {
  delay = 1000;
  return Math.min(30000, delay * 2 ** (attemps - 1));
};

module.exports = getDelay;