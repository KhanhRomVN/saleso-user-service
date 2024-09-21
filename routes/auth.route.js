const express = require("express");
const { AuthController } = require("../controllers");
const { authToken, refreshAccessToken } = require("../middleware/authToken");
const router = express.Router();

const routes = [
  // Update new email: Verify new email and send email verification OTP code to update new email
  // Register: Verify new email before create new account
  {
    method: "post",
    path: "/email-verify",
    handler: AuthController.verifyNewEmail,
  },
  {
    method: "post",
    path: "/register-otp",
    handler: AuthController.registerUserWithOTP,
  },
  {
    method: "post",
    path: "/login",
    handler: AuthController.loginUser,
  },
  // Verify users before taking actions like changing email or password...
  {
    method: "post",
    path: "/verify/account",
    middleware: [authToken],
    handler: AuthController.verifyAccount,
  },
  // use this function to verify refreshToken (when accessToken error) to get new accessToken
  {
    method: "get",
    path: "/refresh/token",
    middleware: [refreshAccessToken],
    handler: AuthController.refreshAccessToken,
  },
];

routes.forEach(({ method, path, middleware = [], handler }) => {
  router[method](path, ...middleware, handler);
});

module.exports = router;
