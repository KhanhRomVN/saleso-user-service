const { Client } = require("@elastic/elasticsearch");

const client = new Client({
  node: process.env.ELASTICSEARCH_NODE,
  auth: {
    apiKey: process.env.ELASTICSEARCH_API_KEY,
  },
});

const connectElasticsearch = async () => {
  try {
    console.log(process.env.ELASTICSEARCH_API_KEY);
    const info = await client.info();
    console.log("Elasticsearch connected:", info.name);
    return client;
  } catch (error) {
    console.error("Elasticsearch connection error:", error);
    throw error;
  }
};

module.exports = { client, connectElasticsearch };
