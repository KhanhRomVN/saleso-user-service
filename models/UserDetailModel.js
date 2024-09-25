const { getDB } = require("../config/mongoDB");
const Joi = require("joi");
const { createError } = require("../services/responseHandler");

const CUSTOMER_COLLECTION_NAME = "customer_detail";
const SELLER_COLLECTION_NAME = "seller_detail";

const CUSTOMER_COLLECTION_SCHEMA = Joi.object({
  customer_id: Joi.string().required(),
  avatar: Joi.string().allow(""),
  name: Joi.string().required().allow(""),
  address: Joi.array()
    .items(
      Joi.object({
        country: Joi.string().required(),
        address: Joi.string().required(),
      })
    )
    .allow(null),
  birthdate: Joi.object({
    day: Joi.number().required(),
    month: Joi.number().required(),
    year: Joi.number().required(),
  })
    .required()
    .allow(null),
}).options({ abortEarly: false });

const SELLER_COLLECTION_SCHEMA = Joi.object({
  seller_id: Joi.string().required(),
  avatar: Joi.string(),
  address: Joi.array().items(
    Joi.object({
      country: Joi.string().required(),
      address: Joi.string().required(),
    })
  ),
  categories: Joi.array().items(Joi.string()).required(),
}).options({ abortEarly: false });

const getCollectionName = (role) => {
  if (role === "customer") return CUSTOMER_COLLECTION_NAME;
  if (role === "seller") return SELLER_COLLECTION_NAME;
  throw createError(
    'Invalid role. Must be either "customer" or "seller".',
    400,
    "INVALID_ROLE"
  );
};

const getSchema = (role) => {
  if (role === "customer") return CUSTOMER_COLLECTION_SCHEMA;
  if (role === "seller") return SELLER_COLLECTION_SCHEMA;
  throw createError(
    'Invalid role. Must be either "customer" or "seller".',
    400,
    "INVALID_ROLE"
  );
};

const handleDBOperation = async (operation, role) => {
  const db = getDB();
  const collectionName = getCollectionName(role);
  try {
    return await operation(db.collection(collectionName));
  } catch (error) {
    console.error(`Error in ${operation.name}: `, error);
    throw createError(
      `Database operation failed: ${error.message}`,
      500,
      "DB_OPERATION_FAILED"
    );
  }
};

const UserDetailModel = {
  // just use for create new account
  newDetail: async (detailData, role) =>
    handleDBOperation(async (collection) => {
      const schema = getSchema(role);
      const { error, value } = schema.validate(detailData, {
        abortEarly: false,
      });
      if (error) {
        throw createError(
          `Validation error: ${error.details.map((d) => d.message).join(", ")}`,
          400,
          "VALIDATION_ERROR"
        );
      }

      return await collection.insertOne(value);
    }, role),

  getDetail: async (user_id, role) =>
    handleDBOperation(async (collection) => {
      const idField = role === "customer" ? "customer_id" : "seller_id";
      console.log(idField);
      const detail = await collection.findOne({ [idField]: user_id });
      if (!detail) {
        throw createError(
          "User detail not found",
          404,
          "USER_DETAIL_NOT_FOUND"
        );
      }

      if (detail === null) {
        return [];
      }
      return detail;
    }, role),

  getAddress: async (user_id, role) =>
    handleDBOperation(async (collection) => {
      const idField = role === "customer" ? "customer_id" : "seller_id";
      const detail = await collection.findOne({ [idField]: user_id });
      if (!detail) {
        throw createError(
          "User address not found",
          404,
          "USER_ADDRESS_NOT_FOUND"
        );
      }

      if (detail.address === null) {
        return [];
      }
      return detail.address;
    }, role),

  updateDetail: async (user_id, updateData, role) =>
    handleDBOperation(async (collection) => {
      const idField = role === "customer" ? "customer_id" : "seller_id";
      const result = await collection.updateOne(
        { [idField]: user_id },
        { $set: updateData }
      );

      if (result.matchedCount === 0) {
        throw createError(
          "User detail not found",
          404,
          "USER_DETAIL_NOT_FOUND"
        );
      }

      return result;
    }, role),
};

module.exports = UserDetailModel;
