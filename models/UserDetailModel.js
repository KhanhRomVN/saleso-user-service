const { getDB } = require("../config/mongoDB");
const Joi = require("joi");

const CUSTOMER_COLLECTION_NAME = "customer_detail";
const SELLER_COLLECTION_NAME = "seller_detail";

const CUSTOMER_COLLECTION_SCHEMA = Joi.object({
  customer_id: Joi.string().required(),
  avatar_uri: Joi.string(),
  name: Joi.string().required(),
  address: Joi.array().items(Joi.string()),
  age: Joi.number().required(),
}).options({ abortEarly: false });

const SELLER_COLLECTION_SCHEMA = Joi.object({
  seller_id: Joi.string().required(),
  avatar_uri: Joi.string(),
  address: Joi.array().items(Joi.string()).required(),
  categories: Joi.array().items(Joi.string()).required(),
}).options({ abortEarly: false });

const getCollectionName = (role) => {
  if (role === "customer") return CUSTOMER_COLLECTION_NAME;
  if (role === "seller") return SELLER_COLLECTION_NAME;
  throw new Error('Invalid role. Must be either "customer" or "seller".');
};

const getSchema = (role) => {
  if (role === "customer") return CUSTOMER_COLLECTION_SCHEMA;
  if (role === "seller") return SELLER_COLLECTION_SCHEMA;
  throw new Error('Invalid role. Must be either "customer" or "seller".');
};

const handleDBOperation = async (operation, role) => {
  const db = getDB();
  const collectionName = getCollectionName(role);
  try {
    return await operation(db.collection(collectionName));
  } catch (error) {
    console.error(`Error in ${operation.name}: `, error);
    throw error;
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
        throw new Error(
          `Validation error: ${error.details.map((d) => d.message).join(", ")}`
        );
      }

      return await collection.insertOne(value);
    }, role),

  getDetail: async (user_id, role) =>
    handleDBOperation(async (collection) => {
      const idField = role === "customer" ? "customer_id" : "seller_id";
      return await collection.findOne({ [idField]: user_id });
    }, role),

  updateDetail: async (user_id, updateData, role) =>
    handleDBOperation(async (collection) => {
      const idField = role === "customer" ? "customer_id" : "seller_id";
      const schema = getSchema(role);
      const { error, value } = schema.validate(updateData, {
        abortEarly: false,
        stripUnknown: true,
      });
      if (error) {
        throw new Error(
          `Validation error: ${error.details.map((d) => d.message).join(", ")}`
        );
      }

      return await collection.updateOne(
        { [idField]: user_id },
        { $set: value }
      );
    }, role),
};

module.exports = UserDetailModel;
