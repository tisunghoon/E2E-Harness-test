import { mkdirSync, writeFileSync } from 'node:fs';
const origin = process.argv[2];
if (!/^https:\/\/[a-z0-9.-]+\.vercel\.app$/.test(origin || '')) throw new Error('Expected Vercel HTTPS origin');
const start = Date.now();
const samples = [];
for (let i = 0; i <= 10; i++) {
  if (i) await new Promise(resolve => setTimeout(resolve, Math.max(0, start + i * 30000 - Date.now())));
  const sample = { at: new Date().toISOString() };
  try {
    for (const path of ['/api/health', '/api/posts']) {
      const response = await fetch(origin + path, { signal: AbortSignal.timeout(15000) });
      const body = await response.json();
      sample[path] = { status: response.status, valid: response.ok && (path.endsWith('health') ? body.status === 'UP' : Array.isArray(body)) };
    }
  } catch (error) { sample.error = error.message; }
  samples.push(sample);
  console.log(JSON.stringify(sample));
}
const passed = samples.every(s => !s.error && s['/api/health'].valid && s['/api/posts'].valid);
mkdirSync('evidence/production', { recursive: true });
writeFileSync('evidence/production/observation.json', JSON.stringify({ origin, elapsedMs: Date.now() - start, passed, samples }, null, 2));
if (!passed) process.exitCode = 1;
