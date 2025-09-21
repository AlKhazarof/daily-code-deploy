const { Queue, QueueEvents } = require('bullmq');

const connection = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
};

const queueName = process.env.QUEUE_NAME || 'dcd-builds';

const queue = new Queue(queueName, { connection });
const queueEvents = new QueueEvents(queueName, { connection });

module.exports = { queue, queueEvents, connection, queueName };