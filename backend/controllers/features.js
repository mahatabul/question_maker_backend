const pythonapi = require("../utils/pythonapi");
const { StatusCodes } = require("http-status-codes");

const generate_mcq = async (req, res) => {
  try {
    const response = await pythonapi.post("/pdf/generate", req.body, {
      responseType: "stream",
    });
    response.data.pipe(res);

  } catch (err) {
    console.error(err.message);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ msg: "PDF generation failed" });
  }
};

module.exports = generate_mcq;
