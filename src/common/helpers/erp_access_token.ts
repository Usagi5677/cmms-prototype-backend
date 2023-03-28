import axios from 'axios';
import { InternalServerErrorException, Logger } from '@nestjs/common';
// const oauth = require('axios-oauth-client');

export async function erp_access_token() {
  const logger = new Logger('ERP Access Token');
  const acess_token_url = process.env.ERP_ACCESS_TOKEN_URL;
  const appId = process.env.ERP_APP_ID;
  const secret = process.env.ERP_CLIENT_SRECRET;
  const scope = process.env.ERP_SCOPE;
  const grantType = process.env.ERP_GRANT_TYPE;

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const qs = require('qs');

    const postData = {
      grant_type: grantType,
      client_id: appId,
      client_secret: secret,
      scope: scope,
    };

    axios.defaults.headers.post['Content-Type'] =
      'application/x-www-form-urlencoded';

    let token = {};
    await axios
      .post(acess_token_url, qs.stringify(postData))
      .then((response) => {
        token = response.data;
      })
      .catch((error) => {
        throw Error(error);
      });

    return token;
  } catch (e) {
    console.log(e);
    throw Error(e);
  }
}
