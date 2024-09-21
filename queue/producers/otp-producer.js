const amqp = require("amqplib");

const storeOTP = async (email, otp, role) => {
  let connection;
  let channel;
  try {
    connection = await amqp.connect(process.env.RABBITMQ_URL);
    channel = await connection.createChannel();
    const queue = "store_otp_queue";
    const correlationId = generateUuid();

    return new Promise((resolve, reject) => {
      const replyQueue = "amq.rabbitmq.reply-to";

      channel.consume(
        replyQueue,
        (msg) => {
          if (msg.properties.correlationId === correlationId) {
            const content = JSON.parse(msg.content.toString());
            if (content.error) {
              reject(new Error(content.error));
            } else {
              resolve(content);
            }
            channel.close();
            connection.close();
          }
        },
        { noAck: true }
      );

      channel.sendToQueue(
        queue,
        Buffer.from(JSON.stringify({ email, otp, role })),
        {
          correlationId: correlationId,
          replyTo: replyQueue,
        }
      );
    });
  } catch (error) {
    console.error("Error in storeOTP producer:", error);
    if (channel) await channel.close();
    if (connection) await connection.close();
    throw error;
  }
};

const verifyOTP = async (email, otp, role) => {
  let connection;
  let channel;
  try {
    connection = await amqp.connect(process.env.RABBITMQ_URL);
    channel = await connection.createChannel();
    const queue = "verify_otp_queue";
    const correlationId = generateUuid();

    return new Promise((resolve, reject) => {
      const replyQueue = "amq.rabbitmq.reply-to";

      channel.consume(
        replyQueue,
        (msg) => {
          if (msg.properties.correlationId === correlationId) {
            const content = JSON.parse(msg.content.toString());
            if (content.error) {
              reject(new Error(content.error));
            } else {
              resolve(content);
            }
            channel.close();
            connection.close();
          }
        },
        { noAck: true }
      );

      channel.sendToQueue(
        queue,
        Buffer.from(JSON.stringify({ email, otp, role })),
        {
          correlationId: correlationId,
          replyTo: replyQueue,
        }
      );
    });
  } catch (error) {
    console.error("Error in verifyOTP producer:", error);
    if (channel) await channel.close();
    if (connection) await connection.close();
    throw error;
  }
};

function generateUuid() {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
}

module.exports = { storeOTP, verifyOTP };
