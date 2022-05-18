import { Injectable } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisCacheService {
  //constructor() {}
  PREFIX = 'cmms';
  async connect(): Promise<RedisClientType<any>> {
    const client = createClient();
    client.on('error', (err) => console.log('Redis Client Error', err));
    await client.connect();
    return client;
  }

  parseWithDate(jsonString: string): any {
    const reDateDetect = /(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/; // startswith: 2015-04-29T22:06:55
    const resultObject = JSON.parse(jsonString, (key: any, value: any) => {
      if (typeof value == 'string' && reDateDetect.exec(value)) {
        return new Date(value);
      }
      return value;
    });
    return resultObject;
  }

  async get(key): Promise<any> {
    const client = await this.connect();
    const valueJSON = await client.get(`${this.PREFIX}:${key}`);
    const value = this.parseWithDate(valueJSON);
    client.quit();
    return value;
  }

  async set(key, value, ttl) {
    const client = await this.connect();
    const valueJSON = JSON.stringify(value);
    await client.set(`${this.PREFIX}:${key}`, valueJSON, { EX: ttl });
    client.quit();
  }

  async setFor10Sec(key, value) {
    await this.set(key, value, 10);
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
    const client = await this.connect();
    const keysWithPrefix = await client.keys(`${this.PREFIX}:*`);
    client.quit();
    return keysWithPrefix.map((k) => k.split(`${this.PREFIX}:`)[1]);
  }

  async getKeysPattern(pattern: string) {
    const client = await this.connect();
    const keysWithPrefix = await client.keys(`${this.PREFIX}:${pattern}`);
    client.quit();
    return keysWithPrefix.map((k) => k.split(`${this.PREFIX}:`)[1]);
  }

  async del(key) {
    const client = await this.connect();
    await client.del(`${this.PREFIX}:${key}`);
    client.quit();
  }

  async delPattern(pattern: string) {
    const keys = await this.getKeysPattern(pattern);
    for (const key of keys) {
      await this.del(key);
    }
  }

  async deleteAll() {
    const keys = await this.getKeys();
    keys.forEach(async (key) => {
      await this.del(key);
    });
    console.log('Redis cache flushed.');
  }
}
