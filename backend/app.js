const express = require("express");
const rateLimit = require("express-rate-limit");
const connectDB = require("./db/connect.js");
const app = express();

const { notFound, errorHandlerMiddleware } = require("./middleware");

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});

app.use("/api/", limiter);
require("dotenv").config();

const user_router = require("./routes/user.js");
const walletrouter = require("./routes/wallet.js");

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use("/api/v1", user_router);
app.use("/api/v1/wallet", walletrouter);

app.use(notFound);
app.use(errorHandlerMiddleware);

const port = process.env.PORT || 5000;
const start = async () => {
  await connectDB(process.env.MONGO_URI);
  app.listen(port, () => {
    console.log(`Listing to port ${port}`);
  });
};

start();
