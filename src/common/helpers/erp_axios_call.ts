import axios from 'axios';
import { InternalServerErrorException, Logger } from '@nestjs/common';
import { erp_access_token } from './erp_access_token';
import { RedisCacheService } from 'src/redisCache.service';

export async function erp_axios_call(
  url: string,
  variables?: any,
  ispostRequest: boolean = false
) {
  const logger = new Logger('ERP Service');
  const baseUrl = process.env.ERP_BASE_URL;
  const redisCacheService = new RedisCacheService();

  let erpToken = await redisCacheService.get(`erp_access_token`);

  if (!erpToken) {
    try {
      erpToken = await erp_access_token();
      const secondsInDay = erpToken.expires_in;
      await redisCacheService.set(
        `erp_access_token`,
        erpToken.access_token,
        secondsInDay
      );
    } catch (e) {
      console.log('Error while caching token ', e);
    }
  }

  // axios.defaults.headers.common['Authorization'] = erpToken;
  // axios.defaults.headers.post['Content-Type'] = 'application/json';
  const params = JSON.stringify(variables);
  try {
    if (ispostRequest) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const https = require('https');
      const agent = new https.Agent({
        rejectUnauthorized: false,
      });
      return await axios
        .post(baseUrl + url, params, {
          httpsAgent: agent,
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: 'Bearer ' + erpToken,
          },
        })
        .catch((error) => {
          logger.error({
            code: error.response.status,
            errors: error.response.data.errors,
          });
          throw new InternalServerErrorException(error);
        });
    } else {
      return await axios
        .get(baseUrl + url, {
          params: {
            ...variables,
          },
        })
        .catch((error) => {
          logger.error({
            code: error.response.status,
            errors: error.response.data.errors,
          });
          throw new InternalServerErrorException(error);
        });
    }
  } catch (error) {
    console.log(error);
    throw Error(error);
  }
}
