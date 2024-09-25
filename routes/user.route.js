const express = require("express");
const { authToken } = require("../middleware/authToken");
const { UserController } = require("../controllers");
const router = express.Router();

const routes = [
  {
    method: "get",
    path: "/",
    middleware: [authToken],
    handler: UserController.getUser,
  },
  {
    method: "get",
    path: "/user-detail",
    middleware: [authToken],
    handler: UserController.getDetail,
  },
  {
    method: "get",
    path: "/user-address",
    middleware: [authToken],
    handler: UserController.getAddress,
  },
  {
    method: "put",
    path: "/update/username",
    middleware: [authToken],
    handler: UserController.updateUsername,
  },
  {
    method: "put",
    path: "/update/user-detail",
    middleware: [authToken],
    handler: UserController.updateDetail,
  },
  {
    method: "put",
    path: "/new-email",
    middleware: [authToken],
    handler: UserController.newEmail,
  },
  {
    method: "put",
    path: "/update/new-email",
    middleware: [authToken],
    handler: UserController.updateEmail,
  },
  // update new password based on old password (user remembers old password)
  {
    method: "put",
    path: "/update/password",
    middleware: [authToken],
    handler: UserController.updatePassword,
  },
  // In case you forget your password, an OTP will be sent to your email
  {
    method: "put",
    path: "/forget/password",
    middleware: [authToken],
    handler: UserController.forgetPassword,
  },
  // Update forgotten password with OTP and new password
  {
    method: "put",
    path: "/update/forget-password",
    middleware: [authToken],
    handler: UserController.updateForgetPassword,
  },
];

routes.forEach(({ method, path, middleware = [], handler }) => {
  router[method](path, ...middleware, handler);
});

module.exports = router;
