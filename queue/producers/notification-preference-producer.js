const amqp = require("amqplib");

const RABBITMQ_URL = process.env.RABBITMQ_URL;
const NEW_PREFERENCE_QUEUE = "notification_preferences_queue";
const GET_ALLOW_PREFERENCE_QUEUE = "get_allow_notification_preferences_queue";

async function sendNewNotificationPreference(userId, role) {
  let connection;
  try {
    connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();

    await channel.assertQueue(NEW_PREFERENCE_QUEUE, { durable: true });

    const message = JSON.stringify({ userId, role });
    channel.sendToQueue(NEW_PREFERENCE_QUEUE, Buffer.from(message), {
      persistent: true,
    });

    await channel.close();
  } catch (error) {
    console.error("Error in sendNotificationPreference:", error);
    throw error;
  } finally {
    if (connection) await connection.close();
  }
}

async function sendGetAllowNotificationPreference(userId, role) {
  let connection;
  try {
    connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();

    await channel.assertQueue(GET_ALLOW_PREFERENCE_QUEUE, { durable: true });

    const correlationId = generateUuid();
    const message = JSON.stringify({ userId, role });

    return new Promise((resolve, reject) => {
      channel.consume(
        GET_ALLOW_PREFERENCE_QUEUE,
        (msg) => {
          if (msg.properties.correlationId === correlationId) {
            const response = JSON.parse(msg.content.toString());
            resolve(response);
            channel.close();
            connection.close();
          }
        },
        { noAck: true }
      );

      channel.sendToQueue(GET_ALLOW_PREFERENCE_QUEUE, Buffer.from(message), {
        correlationId: correlationId,
        replyTo: GET_ALLOW_PREFERENCE_QUEUE,
      });
    });
  } catch (error) {
    console.error("Error in sendGetAllowNotificationPreference:", error);
    throw error;
  }
}

function generateUuid() {
  return (
    Math.random().toString() +
    Math.random().toString() +
    Math.random().toString()
  );
}

module.exports = {
  sendGetAllowNotificationPreference,
};
