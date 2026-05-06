// netlify/functions/ac-proxy.js
// Server-side proxy to the ActiveCampaign API.
// Reads the API key from the AC_API_KEY environment variable.
// Forwards any GET request with a `path` query param to:
//   https://ipmionline81168.api-us1.com/api/3/{path}

const AC_BASE = 'https://ipmionline81168.api-us1.com/api/3';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

exports.handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const apiKey = process.env.AC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'AC_API_KEY environment variable is not set on the Netlify site.',
      }),
    };
  }

  const params = event.queryStringParameters || {};
  let path = params.path;

  if (!path) {
    return {
      statusCode: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Missing required `path` query parameter.' }),
    };
  }

  // Allow paths supplied with or without a leading slash.
  if (!path.startsWith('/')) path = '/' + path;

  const url = `${AC_BASE}${path}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Api-Token': apiKey,
        'Accept': 'application/json',
      },
    });

    const text = await response.text();

    return {
      statusCode: response.status,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'application/json',
      },
      body: text,
    };
  } catch (err) {
    return {
      statusCode: 502,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Upstream request to ActiveCampaign failed.',
        detail: String(err && err.message ? err.message : err),
      }),
    };
  }
};
