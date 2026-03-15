const express = require("express");
const connectDB = require("./db/connect.js");
const app = express();

const { notFound, errorHandlerMiddleware } = require("./middleware");

require("dotenv").config();

const mainrouter = require("./routes/user.js");

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use("/api/v1", mainrouter);

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
