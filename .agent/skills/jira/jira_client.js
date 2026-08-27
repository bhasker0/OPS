const https = require('https');

const JIRA_CONFIG = {
  domain: 'bhaskersavaliya.atlassian.net',
  email: 'bhaskersavalia@gmail.com',
  apiToken: 'ATATT3xFfGF0iN0bIbEXC5CEqobQiOQIURzjL4SNJFECv6ac_qJ6VxZeQHctDf-KjfFIsb3Z4QLUuGLoTVMk6a_z-0UOlbEDOes4Pz4kfNiDajVdSxHid7qiUjQvgtRJlPgLl_rqNeZ74NA9PT7-OC4w9eWI18tO9Xmb_kYoje_xNYILVbzlWCo=2572AC47'
};

function getAuthHeader() {
  const token = Buffer.from(`${JIRA_CONFIG.email}:${JIRA_CONFIG.apiToken}`).toString('base64');
  return `Basic ${token}`;
}

function jiraRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: JIRA_CONFIG.domain,
      path: path,
      method: method,
      headers: {
        'Authorization': getAuthHeader(),
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: data ? JSON.parse(data) : null });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', err => reject(err));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

module.exports = {
  JIRA_CONFIG,
  jiraRequest
};
