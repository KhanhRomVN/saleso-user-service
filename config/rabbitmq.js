const amqp = require("amqplib");

let connection;
let channel;

const connectRabbitMQ = async () => {
  try {
    connection = await amqp.connect(process.env.RABBITMQ_URL);
    channel = await connection.createChannel();
    console.log("Connected to RabbitMQ");
    return channel;
  } catch (error) {
    console.error("Error connecting to RabbitMQ:", error);
    throw error;
  }
};

const getChannel = () => {
  if (!channel) {
    throw new Error("RabbitMQ channel not initialized");
  }
  return channel;
};

module.exports = { connectRabbitMQ, getChannel };
