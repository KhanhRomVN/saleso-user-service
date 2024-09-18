const { MongoClient, ServerApiVersion } = require("mongodb");
const logger = require("./logger");

class DatabaseConnection {
  constructor() {
    this.client = new MongoClient(process.env.MONGODB_URI, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
    });
    this.db = null;
    this.maxRetries = 5;
    this.retryInterval = 5000; // 5 seconds
  }

  async connect(retries = 0) {
    try {
      await this.client.connect();
      this.db = this.client.db(process.env.DATABASE_NAME);
      logger.info("Successfully connected to the database");
    } catch (error) {
      logger.error("Error connecting to the database", error);
      if (retries < this.maxRetries) {
        logger.info(
          `Retrying connection in ${this.retryInterval / 1000} seconds...`
        );
        await new Promise((resolve) => setTimeout(resolve, this.retryInterval));
        return this.connect(retries + 1);
      } else {
        logger.error("Max retries reached. Exiting process.");
        process.exit(1);
      }
    }
  }

  getDB() {
    if (!this.db) {
      throw new Error("Database not connected. Call connect() first.");
    }
    return this.db;
  }

  getClient() {
    if (!this.client) {
      throw new Error("Database client not initialized. Call connect() first.");
    }
    return this.client;
  }

  async close() {
    if (this.client) {
      await this.client.close();
      logger.info("Database connection closed");
    }
  }

  async startSession() {
    if (!this.client) {
      throw new Error("Database client not initialized. Call connect() first.");
    }
    return this.client.startSession();
  }
}

const dbConnection = new DatabaseConnection();

module.exports = {
  connectDB: () => dbConnection.connect(),
  getDB: () => dbConnection.getDB(),
  getClient: () => dbConnection.getClient(),
  closeDB: () => dbConnection.close(),
  startSession: () => dbConnection.startSession(),
};