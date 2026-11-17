// Same-origin session/CSRF proxy for Vercel. Never accept an upstream from user input.
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const origin = process.env.RAILWAY_ORIGIN;
  if (!origin || !/^https:\/\/[a-z0-9.-]+\.up\.railway\.app\/?$/.test(origin)) {
    return res.status(503).json({ message: '서버 연결 설정을 확인하고 있습니다.' });
  }
  const path = Array.isArray(req.query.path) ? req.query.path.join('/') : req.query.path || '';
  if (!/^(csrf|health|auth\/(register|login|logout|me)|posts(?:\/[a-f0-9-]+)?)$/.test(path)) {
    return res.status(404).json({ message: '요청한 경로가 없습니다.' });
  }
  const headers = {};
  for (const key of ['content-type', 'cookie', 'x-csrf-token']) {
    if (req.headers[key]) headers[key] = req.headers[key];
  }
  let body;
  if (!['GET', 'HEAD'].includes(req.method) && req.body !== undefined) {
    body = typeof req.body === 'string' || Buffer.isBuffer(req.body) ? req.body
      : headers['content-type']?.includes('application/x-www-form-urlencoded')
        ? new URLSearchParams(req.body).toString() : JSON.stringify(req.body);
  }
  try {
    const upstream = await fetch(`${origin.replace(/\/$/, '')}/api/${path}`, {
      method: req.method, headers, body, redirect: 'manual', signal: AbortSignal.timeout(15000),
    });
    res.status(upstream.status);
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json');
    const cookies = upstream.headers.getSetCookie();
    if (cookies.length) res.setHeader('Set-Cookie', cookies);
    return res.send(Buffer.from(await upstream.arrayBuffer()));
  } catch {
    return res.status(503).json({ message: '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.' });
  }
}
