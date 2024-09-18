const jwt = require("jsonwebtoken");
const { UserModel } = require("../models");

const verifyToken = (accessToken) => {
  if (!accessToken) {
    throw new Error("No accessToken provided");
  }
  return jwt.verify(accessToken, process.env.JWT_SECRET_KEY);
};

const createAuthMiddleware = (roles) => async (req, res, next) => {
  try {
    const accessToken = req.header("accessToken");
    const decoded = verifyToken(accessToken);

    let user = null;
    for (const role of roles) {
      user = await UserModel.getUserById(decoded.user_id, role);
      if (user) break;
    }

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!roles.includes(user.role)) {
      return res.status(403).json({ error: "You are not authorized" });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Error in auth middleware:", error);
    if (error.message === "No accessToken provided") {
      return res
        .status(401)
        .json({ error: "Unauthorized - No accessToken provided" });
    }
    if (error.name === "JsonWebTokenError") {
      return res
        .status(401)
        .json({ error: "Unauthorized - Invalid accessToken" });
    }
    res.status(500).json({ error: "Internal server error" });
  }
};

const refreshAccessToken = async (req, res, next) => {
  const refreshToken = req.header("refreshToken");
  console.log(refreshToken);

  if (!refreshToken) {
    return res.status(401).json({ error: "Refresh token not provided" });
  }

  try {
    const decoded = verifyToken(refreshToken, process.env.JWT_SECRET_KEY);

    const user = await UserModel.getUserById(decoded.user_id, decoded.role);

    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ error: "Invalid refresh token" });
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
    next();
  } catch (error) {
    console.error("Error in refreshAccessToken:", error);
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Invalid refresh token" });
    }
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Refresh token expired" });
    }
    res.status(500).json({ error: "Internal server error" });
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
