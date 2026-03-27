const express = require("express");
const axios = require("axios");

const router = express.Router();

router.post("/pdf/generate", async (req, res) => {
  try {
    const response = await axios.post(
      "http://127.0.0.1:8000/pdf/generate",
      req.body,
      {
        responseType: "stream", // VERY IMPORTANT
      }
    );

    // Set headers for download
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=questions.pdf"
    );

    // Pipe PDF stream to client
    response.data.pipe(res);

  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "PDF generation failed" });
  }
});

module.exports = router;