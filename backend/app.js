const express = require("express");
const rateLimit = require("express-rate-limit");
const connectDB = require("./db/connect.js");
const app = express();
const cors = require('cors')

// Configure CORS specifically for your React app
const corsOptions = {
  origin: 'http://localhost:5173', // Your React app URL
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Allowed methods
  allowedHeaders: ['Content-Type', 'Authorization'], // Allowed headers
  credentials: true, // Allow cookies/auth headers
  optionsSuccessStatus: 200 // For legacy browsers
};

app.use(cors(corsOptions))

const { notFound, errorHandlerMiddleware } = require("./middleware");


const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});

app.use("/api/", limiter);
require("dotenv").config();

const user_router = require("./routes/user.js");
const walletrouter = require("./routes/wallet.js");
const feature_router = require("./routes/features.js");
const adminRouter = require("./routes/admin.js")

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/v1", user_router);
app.use("/api/v1/wallet", walletrouter);
app.use("/api/v1/admin",adminRouter);
app.use("/api/v1/features", feature_router);

app.use(notFound);
app.use(errorHandlerMiddleware);

const {startTelegramListener} = require("./utils/telegramListener.js") 

const port = process.env.PORT || 5000;
const start = async () => {
  await connectDB(process.env.MONGO_URI);
  startTelegramListener();
  app.listen(port, () => {
    console.log(`Listing to port ${port}`);
  });
};

start();
