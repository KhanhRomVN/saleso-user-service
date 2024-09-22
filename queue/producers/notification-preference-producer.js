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

    console.log(
      `Sent notification preference for user ${userId} with role ${role} to queue`
    );

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

    const message = JSON.stringify({ userId, role });
    channel.sendToQueue(GET_ALLOW_PREFERENCE_QUEUE, Buffer.from(message), {
      persistent: true,
    });

    console.log(
      `Sent request to get allowed notification preferences for user ${userId}`
    );

    await channel.close();
  } catch (error) {
    console.error("Error in sendGetAllowNotificationPreference:", error);
    throw error;
  } finally {
    if (connection) await connection.close();
  }
}

module.exports = {
  sendNewNotificationPreference,
  sendGetAllowNotificationPreference,
};
