const amqp = require("amqplib");
const { UserModel } = require("../../models");

const startGetUserByIdConsumer = async () => {
  let connection;
  let channel;
  try {
    connection = await amqp.connect(process.env.RABBITMQ_URL);
    channel = await connection.createChannel();
    const queue = "get_user_by_id_queue";

    await channel.assertQueue(queue, { durable: false });

    channel.consume(queue, async (msg) => {
      const { userId, role } = JSON.parse(msg.content.toString());

      try {
        const user = await UserModel.getUserById(userId, role);
        channel.sendToQueue(
          msg.properties.replyTo,
          Buffer.from(JSON.stringify(user)),
          { correlationId: msg.properties.correlationId }
        );
      } catch (error) {
        console.error("Error fetching user:", error);
        channel.sendToQueue(
          msg.properties.replyTo,
          Buffer.from(JSON.stringify({ error: error.message })),
          { correlationId: msg.properties.correlationId }
        );
      }

      channel.ack(msg);
    });
  } catch (error) {
    console.error("Error in getUserByIdConsumer:", error);
    if (channel) await channel.close();
    if (connection) await connection.close();
  }
};

module.exports = {
  startGetUserByIdConsumer,
};
