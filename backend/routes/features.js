const express = require("express");
const router = express.Router();

const generate_mcq = require("../controllers/features")

router.route("/pdf/generate").post(generate_mcq)

module.exports = router;