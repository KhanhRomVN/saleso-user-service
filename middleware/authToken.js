const jwt = require("jsonwebtoken");
const { UserModel } = require("../models");
const { createError, sendError } = require("../services/responseHandler");

const verifyToken = (accessToken) => {
  if (!accessToken) {
    throw createError("No accessToken provided", 401, "NO_TOKEN_PROVIDED");
  }
  return jwt.verify(accessToken, process.env.JWT_SECRET_KEY);
};

const createAuthMiddleware = (roles) => async (req, res, next) => {
  try {
    const accessToken = req.header("accessToken");
    const decoded = verifyToken(accessToken);

    const user = await UserModel.getUserById(decoded.user_id, decoded.role);

    if (!user) {
      throw createError("User not found", 404, "USER_NOT_FOUND");
    }

    if (!roles.includes(user.role)) {
      throw createError("You are not authorized", 403, "UNAUTHORIZED_ROLE");
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Error in auth middleware:", error);
    sendError(res, error);
  }
};

const refreshAccessToken = async (req, res, next) => {
  const refreshToken = req.header("refreshToken");

  if (!refreshToken) {
    return sendError(
      res,
      createError("Refresh token not provided", 401, "NO_REFRESH_TOKEN")
    );
  }

  try {
    const decoded = verifyToken(refreshToken, process.env.JWT_SECRET_KEY);

    const user = await UserModel.getUserById(decoded.user_id, decoded.role);

    if (!user || user.refreshToken !== refreshToken) {
      throw createError("Invalid refresh token", 401, "INVALID_REFRESH_TOKEN");
    }

    const newAccessToken = jwt.sign(
      { user_id: user._id, role: user.role },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "15m" }
    );

    const newRefreshToken = jwt.sign(
      { user_id: user._id, role: user.role },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "7d" }
    );

    await UserModel.updateRefreshToken(user._id, newRefreshToken, user.role);

    req.token = {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
    req.user = user; // Thêm thông tin user vào request
    next();
  } catch (error) {
    console.error("Error in refreshAccessToken:", error);
    sendError(res, error);
  }
};

module.exports = {
  authToken: createAuthMiddleware(["customer", "seller"]),
  authCustomerToken: createAuthMiddleware(["customer"]),
  authSellerToken: createAuthMiddleware(["seller"]),
  authAdminToken: createAuthMiddleware(["admin"]),
  authEmployeeToken: createAuthMiddleware(["employee"]),
  refreshAccessToken,
};
