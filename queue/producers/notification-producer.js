const amqp = require("amqplib");

const RABBITMQ_URL = process.env.RABBITMQ_URL;
const CREATE_NOTIFICATION_QUEUE = "create_notification_queue";

async function sendCreateNewNotification(notificationData) {
  let connection;
  try {
    connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();

    await channel.assertQueue(CREATE_NOTIFICATION_QUEUE, { durable: true });

    const message = JSON.stringify(notificationData);
    channel.sendToQueue(CREATE_NOTIFICATION_QUEUE, Buffer.from(message), {
      persistent: true,
    });

    await channel.close();
  } catch (error) {
    console.error("Error in sendCreateNotification:", error);
    throw error;
  } finally {
    if (connection) await connection.close();
  }
}

module.exports = { sendCreateNewNotification };
