const logger = require("../config/logger");

class AppError extends Error {
  constructor(message, statusCode, errorCode = null) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true;
    this.errorCode = errorCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

const sendResponse = (res, statusCode, data) => {
  const status = `${statusCode}`.startsWith("2") ? "success" : "fail";
  res.status(statusCode).json({
    status,
    data,
  });
};

const sendError = (res, error) => {
  if (error instanceof AppError) {
    return sendResponse(res, error.statusCode, {
      status: error.status,
      message: error.message,
      errorCode: error.errorCode,
    });
  }

  // Unexpected errors
  logger.error("Unexpected error:", error);
  return sendResponse(res, 500, {
    status: "error",
    message: "Something went wrong!",
    errorCode: "INTERNAL_SERVER_ERROR",
  });
};

const handleRequest = async (req, res, operation) => {
  try {
    const result = await operation(req);
    sendResponse(res, 200, result);
  } catch (error) {
    sendError(res, error);
  }
};

const createError = (message, statusCode, errorCode = null) => {
  return new AppError(message, statusCode, errorCode);
};

module.exports = {
  AppError,
  sendResponse,
  sendError,
  handleRequest,
  createError,
};
