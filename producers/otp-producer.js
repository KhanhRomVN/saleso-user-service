const { getChannel } = require("../config/rabbitmq");
const { v4: uuidv4 } = require("uuid");

const OTP_QUEUE = "otp_queue";

const OTPProducer = {
  storeOTP: async (email, otp, role) => {
    console.log(email);
    const channel = getChannel();
    const message = {
      action: "storeOTP",
      data: { email, otp, role },
    };
    channel.sendToQueue(OTP_QUEUE, Buffer.from(JSON.stringify(message)));
  },

  verifyOTP: async (email, otp, role) => {
    const channel = getChannel();
    return new Promise((resolve, reject) => {
      const correlationId = uuidv4();
      const replyQueue = `amq.rabbitmq.reply-to`;

      channel.consume(
        replyQueue,
        (msg) => {
          if (msg.properties.correlationId === correlationId) {
            const response = JSON.parse(msg.content.toString());
            resolve(response.result);
          }
        },
        { noAck: true }
      );

      const message = {
        action: "verifyOTP",
        data: { email, otp, role },
      };
      channel.sendToQueue(OTP_QUEUE, Buffer.from(JSON.stringify(message)), {
        correlationId,
        replyTo: replyQueue,
      });
    });
  },
};

module.exports = { OTPProducer };
