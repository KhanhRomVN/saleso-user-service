const { getChannel } = require("../config/rabbitmq");

const RabbitMQService = {
  publishMessage: async (queue, message) => {
    try {
      const channel = getChannel();
      await channel.assertQueue(queue, { durable: true });
      channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)));
      console.log(`Message sent to queue ${queue}`);
    } catch (error) {
      console.error("Error publishing message:", error);
      throw error;
    }
  },

  consumeMessage: async (queue, callback) => {
    try {
      const channel = getChannel();
      await channel.assertQueue(queue, { durable: true });
      console.log(`Waiting for messages in queue ${queue}`);
      channel.consume(queue, (msg) => {
        if (msg !== null) {
          const content = JSON.parse(msg.content.toString());
          callback(content);
          channel.ack(msg);
        }
      });
    } catch (error) {
      console.error("Error consuming message:", error);
      throw error;
    }
  },
};

module.exports = RabbitMQService;
