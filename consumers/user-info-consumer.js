const amqp = require("amqplib");
const { UserModel } = require("../models");

const USER_INFO_QUEUE = "user_info_queue";
const RABBITMQ_URL = process.env.RABBITMQ_URL;

async function startUserInfoConsumer() {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();

    await channel.assertQueue(USER_INFO_QUEUE, { durable: false });

    console.log("Waiting for user info requests...");

    channel.consume(USER_INFO_QUEUE, async (msg) => {
      const data = msg.content.toString();
      const { userId, role } = JSON.parse(data);
      try {
        const user = await UserModel.getUserById(userId, role);
        channel.sendToQueue(
          msg.properties.replyTo,
          Buffer.from(
            JSON.stringify({
              username: user.username,
              role: user.role,
              _id: user._id,
            })
          ),
          {
            correlationId: msg.properties.correlationId,
          }
        );
      } catch (error) {
        console.error("Error processing user info request:", error);
        channel.sendToQueue(
          msg.properties.replyTo,
          Buffer.from(
            JSON.stringify({
              username: user.username,
              role: user.role,
              _id: user._id,
            })
          ),
          {
            correlationId: msg.properties.correlationId,
          }
        );
      } finally {
        channel.ack(msg);
      }
    });
  } catch (error) {
    console.error("Error starting user info consumer:", error);
  }
}

module.exports = { startUserInfoConsumer };
