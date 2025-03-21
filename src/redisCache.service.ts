import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisCacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisCacheService.name);
  private client: RedisClientType<any>;
  private isConnecting = false;
  private connectionPromise: Promise<RedisClientType<any>> | null = null;
  PREFIX = 'cmms';

  async onModuleInit() {
    // Connect once when the module initializes
    try {
      await this.getClient();
      this.logger.log('Redis cache service initialized');
    } catch (error) {
      this.logger.error(
        `Failed to initialize Redis cache service: ${error.message}`
      );
    }
  }

  async onModuleDestroy() {
    // Close connection when the app shuts down
    if (this.client && this.client.isOpen) {
      try {
        await this.client.quit();
        this.logger.log('Redis connection closed');
      } catch (error) {
        this.logger.error(`Error closing Redis connection: ${error.message}`);
      }
    }
  }

  private async initClient(): Promise<RedisClientType<any>> {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      this.logger.log(`Redis URL: ${redisUrl}`);

      // Parse the Redis URL manually
      let host = 'localhost';
      let port = 6379;

      if (redisUrl && redisUrl !== 'redis://localhost:6379') {
        try {
          const match = redisUrl.match(/redis:\/\/([^:]+):(\d+)/);
          if (match) {
            host = match[1];
            port = parseInt(match[2], 10);
          }
        } catch (err) {
          this.logger.error(`Failed to parse Redis URL: ${err.message}`);
        }
      }

      this.logger.log(`Connecting to Redis at host: ${host}, port: ${port}`);

      // Connect using explicit host and port instead of URL
      const client = createClient({
        socket: {
          host,
          port,
          reconnectStrategy: (retries) => {
            this.logger.warn(`Redis connection retry attempt ${retries}`);
            return Math.min(retries * 100, 3000); // Increasing backoff up to 3 seconds
          },
        },
      });

      // Set up event handlers
      client.on('error', (err) => {
        this.logger.error(`Redis Client Error: ${err.message}`);
      });

      client.on('connect', () => {
        this.logger.log('Connected to Redis');
      });

      client.on('reconnecting', () => {
        this.logger.log('Reconnecting to Redis');
      });

      client.on('end', () => {
        this.logger.log('Redis connection ended');
      });

      // Connect to Redis
      await client.connect();
      return client;
    } catch (error) {
      this.logger.error(
        `Failed to connect to Redis: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  async getClient(): Promise<RedisClientType<any>> {
    // If we already have a connected client, return it
    if (this.client && this.client.isOpen) {
      return this.client;
    }

    // If we're in the process of connecting, wait for that connection
    if (this.isConnecting && this.connectionPromise) {
      return this.connectionPromise;
    }

    // Otherwise, create a new connection
    this.isConnecting = true;
    this.connectionPromise = this.initClient();

    try {
      this.client = await this.connectionPromise;
      this.isConnecting = false;
      return this.client;
    } catch (error) {
      this.isConnecting = false;
      this.connectionPromise = null;
      throw error;
    }
  }

  parseWithDate(jsonString: string): any {
    if (!jsonString) return null;

    const reDateDetect = /(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/; // startswith: 2015-04-29T22:06:55
    try {
      const resultObject = JSON.parse(jsonString, (key: any, value: any) => {
        if (typeof value == 'string' && reDateDetect.exec(value)) {
          return new Date(value);
        }
        return value;
      });
      return resultObject;
    } catch (error) {
      this.logger.error(`Error parsing JSON with date: ${error.message}`);
      return null;
    }
  }

  async get(key): Promise<any> {
    try {
      const client = await this.getClient();
      const valueJSON = await client.get(`${this.PREFIX}:${key}`);
      if (!valueJSON) return null;
      return this.parseWithDate(valueJSON);
    } catch (error) {
      this.logger.error(`Error fetching key ${key}: ${error.message}`);
      return null; // Return null instead of crashing
    }
  }

  async set(key, value, ttl) {
    try {
      const client = await this.getClient();
      const valueJSON = JSON.stringify(value);
      await client.set(`${this.PREFIX}:${key}`, valueJSON, { EX: ttl });
    } catch (error) {
      this.logger.error(`Error setting key ${key}: ${error.message}`);
    }
  }

  async setFor10Sec(key, value) {
    await this.set(key, value, 10);
  }

  async setForHour(key, value) {
    const secondsInHour = 60 * 60;
    await this.set(key, value, secondsInHour);
  }

  async setForDay(key, value) {
    const secondsInDay = 24 * 60 * 60;
    await this.set(key, value, secondsInDay);
  }

  async setForMonth(key, value) {
    const secondsInMonth = 30 * 24 * 60 * 60;
    await this.set(key, value, secondsInMonth);
  }

  async getKeys() {
    try {
      const client = await this.getClient();
      const keysWithPrefix = await client.keys(`${this.PREFIX}:*`);
      return keysWithPrefix.map((k) => k.split(`${this.PREFIX}:`)[1]);
    } catch (error) {
      this.logger.error(`Error getting keys: ${error.message}`);
      return [];
    }
  }

  async getKeysPattern(pattern: string) {
    try {
      const client = await this.getClient();
      const keysWithPrefix = await client.keys(`${this.PREFIX}:${pattern}`);
      return keysWithPrefix.map((k) => k.split(`${this.PREFIX}:`)[1]);
    } catch (error) {
      this.logger.error(
        `Error getting keys with pattern ${pattern}: ${error.message}`
      );
      return [];
    }
  }

  async del(key) {
    try {
      const client = await this.getClient();
      await client.del(`${this.PREFIX}:${key}`);
    } catch (error) {
      this.logger.error(`Error deleting key ${key}: ${error.message}`);
    }
  }

  async delPattern(pattern: string) {
    try {
      const keys = await this.getKeysPattern(pattern);
      for (const key of keys) {
        await this.del(key);
      }
    } catch (error) {
      this.logger.error(
        `Error deleting keys with pattern ${pattern}: ${error.message}`
      );
    }
  }

  async deleteAll() {
    try {
      const keys = await this.getKeys();
      const promises = keys.map((key) => this.del(key));
      await Promise.all(promises);
      this.logger.log('Redis cache flushed.');
    } catch (error) {
      this.logger.error(`Error flushing cache: ${error.message}`);
    }
  }
}
