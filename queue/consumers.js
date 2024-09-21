const { startGetUserByIdConsumer } = require("./consumers/user-consumer");

const runAllConsumers = async () => {
  await startGetUserByIdConsumer();
};

module.exports = {
  runAllConsumers,
};
