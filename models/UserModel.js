const { getDB } = require("../config/mongoDB");
const Joi = require("joi");
const { ObjectId } = require("mongodb");
const bcrypt = require("bcrypt");
const saltRounds = 10;

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
    throw error;
  }
};

const UserModel = {
  registerUser: async (userData, role) => {
    return handleDBOperation(async (collection) => {
      const { error, value } = COLLECTION_SCHEMA.validate(userData, {
        abortEarly: false,
      });
      if (error) {
        throw new Error(
          `Validation error: ${error.details.map((d) => d.message).join(", ")}`
        );
      }
      value.password = await bcrypt.hash(value.password, saltRounds);
      const user = await collection.insertOne(value);
      return user.insertedId;
    }, role);
  },

  confirmEmail: async (email, role) => {
    return handleDBOperation(async (collection) => {
      return await collection.updateOne(
        { email },
        { $set: { emailConfirmed: true } }
      );
    }, role);
  },

  getUserById: async (user_id, role) => {
    return handleDBOperation(async (collection) => {
      return await collection.findOne({ _id: new ObjectId(user_id) });
    }, role);
  },

  getUserByUsername: async (username, role) => {
    return handleDBOperation(async (collection) => {
      return await collection.findOne({ username });
    }, role);
  },

  getUserByEmail: async (email, role) => {
    return handleDBOperation(async (collection) => {
      return await collection.findOne({ email });
    }, role);
  },

  updateUsername: async (user_id, username, role) => {
    return handleDBOperation(async (collection) => {
      return await collection.updateOne(
        { _id: new ObjectId(user_id) },
        { $set: { username }, $currentDate: { update_at: true } }
      );
    }, role);
  },

  updatePassword: async (user_id, newPassword, role) => {
    return handleDBOperation(async (collection) => {
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);
      return await collection.updateOne(
        { _id: new ObjectId(user_id) },
        { $set: { password: hashedNewPassword } }
      );
    }, role);
  },

  updateForgetPassword: async (email, newPassword, role) => {
    return handleDBOperation(async (collection) => {
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);
      return await collection.updateOne(
        { email: email },
        { $set: { password: hashedNewPassword } }
      );
    }, role);
  },

  updateUserField: async (user_id, updateData, role) => {
    return handleDBOperation(async (collection) => {
      return await collection.updateOne(
        { _id: new ObjectId(user_id) },
        { $set: updateData, $currentDate: { update_at: true } }
      );
    }, role);
  },

  updateRefreshToken: async (user_id, refreshToken, role) => {
    return handleDBOperation(async (collection) => {
      return await collection.updateOne(
        { _id: new ObjectId(user_id) },
        { $set: { refreshToken }, $currentDate: { last_login: true } }
      );
    }, role);
  },
};

module.exports = UserModel;
