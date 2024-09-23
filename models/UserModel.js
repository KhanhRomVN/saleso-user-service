const { getDB } = require("../config/mongoDB");
const Joi = require("joi");
const { ObjectId } = require("mongodb");
const bcrypt = require("bcrypt");
const saltRounds = 10;
const cron = require("node-cron");
const { createError } = require("../services/responseHandler");

const COLLECTION_SCHEMA = Joi.object({
  username: Joi.string().optional(),
  email: Joi.string().email().required(),
  password: Joi.string().required(),
  register_at: Joi.date().default(() => new Date()),
  last_login: Joi.date().default(() => new Date()),
  update_at: Joi.date().default(() => new Date()),
  refreshToken: Joi.string().default(""),
  role: Joi.string().required(),
}).options({ abortEarly: false });

const handleDBOperation = async (operation, role) => {
  const db = getDB();
  try {
    return await operation(db.collection(role));
  } catch (error) {
    console.error(`Error in ${operation.name}: `, error);
    throw createError(
      `Database operation failed: ${error.message}`,
      500,
      "DB_OPERATION_FAILED"
    );
  }
};

const UserModel = {
  registerUser: async (userData, role) => {
    return handleDBOperation(async (collection) => {
      const { error, value } = COLLECTION_SCHEMA.validate(userData, {
        abortEarly: false,
      });
      if (error) {
        throw createError(
          `Validation error: ${error.details.map((d) => d.message).join(", ")}`,
          400,
          "VALIDATION_ERROR"
        );
      }
      const user = await collection.insertOne(value);
      return user.insertedId;
    }, role);
  },

  confirmEmail: async (email, role) => {
    return handleDBOperation(async (collection) => {
      const result = await collection.updateOne(
        { email },
        { $set: { emailConfirmed: true } }
      );
      if (result.matchedCount === 0) {
        throw createError("User not found", 404, "USER_NOT_FOUND");
      }
      return result;
    }, role);
  },

  getUserById: async (user_id, role) => {
    return handleDBOperation(async (collection) => {
      const user = await collection.findOne({ _id: new ObjectId(user_id) });
      if (!user) {
        throw createError("User not found", 404, "USER_NOT_FOUND");
      }
      return user;
    }, role);
  },

  getUserByUsername: async (username, role) => {
    return handleDBOperation(async (collection) => {
      const user = await collection.findOne({ username });
      return user;
    }, role);
  },

  getUserByEmail: async (email, role) => {
    return handleDBOperation(async (collection) => {
      return await collection.findOne({ email });
    }, role);
  },

  updateUsername: async (user_id, username, role) => {
    return handleDBOperation(async (collection) => {
      const result = await collection.updateOne(
        { _id: new ObjectId(user_id) },
        { $set: { username }, $currentDate: { update_at: true } }
      );
      if (result.matchedCount === 0) {
        throw createError("User not found", 404, "USER_NOT_FOUND");
      }
      return result;
    }, role);
  },

  updatePassword: async (user_id, newPassword, role) => {
    return handleDBOperation(async (collection) => {
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);
      const result = await collection.updateOne(
        { _id: new ObjectId(user_id) },
        { $set: { password: hashedNewPassword } }
      );
      if (result.matchedCount === 0) {
        throw createError("User not found", 404, "USER_NOT_FOUND");
      }
      return result;
    }, role);
  },

  updateForgetPassword: async (email, newPassword, role) => {
    return handleDBOperation(async (collection) => {
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);
      const result = await collection.updateOne(
        { email: email },
        { $set: { password: hashedNewPassword } }
      );
      if (result.matchedCount === 0) {
        throw createError("User not found", 404, "USER_NOT_FOUND");
      }
      return result;
    }, role);
  },

  updateUserField: async (user_id, updateData, role) => {
    return handleDBOperation(async (collection) => {
      const result = await collection.updateOne(
        { _id: new ObjectId(user_id) },
        { $set: updateData, $currentDate: { update_at: true } }
      );
      if (result.matchedCount === 0) {
        throw createError("User not found", 404, "USER_NOT_FOUND");
      }
      return result;
    }, role);
  },

  updateRefreshToken: async (user_id, refreshToken, role) => {
    return handleDBOperation(async (collection) => {
      const result = await collection.updateOne(
        { _id: new ObjectId(user_id) },
        { $set: { refreshToken }, $currentDate: { last_login: true } }
      );
      if (result.matchedCount === 0) {
        throw createError("User not found", 404, "USER_NOT_FOUND");
      }
      return result;
    }, role);
  },
};

cron.schedule("* * * * *", () => {});

module.exports = UserModel;
