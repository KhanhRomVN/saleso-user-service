//* NPM Package
const express = require("express");
require("dotenv").config();
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const compression = require("compression");
const cors = require("cors");
const http = require("http");

//* MongoDB
const { connectDB } = require("./config/mongoDB");

//* Routes;
const routes = require("./routes");

//* Error Handling Middleware
const { sendError } = require("./services/responseHandler");
//* CORS Configuration
const whiteList = process.env.WHITE_LIST.split(",");
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || whiteList.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
};

const app = express();
const server = http.createServer(app);

//* Middleware
app.use(express.static("public"));
app.use(helmet());
app.use(compression());
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

//* API Routes
Object.entries(routes).forEach(([path, router]) => {
  app.use(`/${path}`, router);
});

//* Error Handling Middleware
app.use((err, res) => {
  sendError(res, err);
});

//* Start Server
const PORT = process.env.PORT || 8089;

// RabbitMQ
const { runAllConsumers } = require("./queue/consumers");

Promise.all([connectDB(), runAllConsumers()])
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Server is running on port: ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to database:", err);
    process.exit(1);
  });
