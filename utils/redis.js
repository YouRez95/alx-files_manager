import { promisify } from 'util';
import { createClient } from 'redis';

/**
 * Class that begin the connection with redis
 * and provide some methods to manipulate data
 */

class RedisClient {
  /**
   * Create a client redis
   * handle errors
   * isReady to check the connection
   */
  constructor() {
    this.client = createClient();
    this.client.get = promisify(this.client.get).bind(this.client);
    this.client.set = promisify(this.client.set).bind(this.client);
    this.client.del = promisify(this.client.del).bind(this.client);
    this.client.on('error', (err) => console.log('Redis Client Error', err));

    this.isReady = new Promise((resolve, reject) => {
      this.client.on('ready', resolve);
      this.client.on('error', reject);
    });
  }

  /**
   * an async function that check the connection
   * is is established or not
   */
  isAlive() {
    // await this.isReady;
    return this.client.connected;
  }

  /**
   * get a value for specific key
   */
  async get(key) {
    const value = await this.client.get(key);
    return value;
  }

  /**
   * set a value for a specific key
   * and expire in specific duration
   */
  async set(key, value, duration) {
    await this.client.set(key, value, 'EX', duration);
  }

  /**
   * delete a key from the cache
   */
  async del(key) {
    await this.client.del(key);
  }
}

// create an instance of the class RedisClient
const redisClient = new RedisClient();

module.exports = redisClient;
