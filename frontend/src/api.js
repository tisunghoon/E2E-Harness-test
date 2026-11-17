export async function api(path, options = {}) {
  const method = options.method || 'GET';
  const headers = {};
  let body;
  if (method !== 'GET') {
    const response = await fetch('/api/csrf', { cache: 'no-store' });
    if (!response.ok) throw new Error('서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.');
    const csrf = await response.json();
    headers[csrf.headerName] = csrf.token;
    if (options.form) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      body = new URLSearchParams(options.form);
    } else if (options.data) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(options.data);
    }
  }
  let response;
  try { response = await fetch(`/api${path}`, { method, headers, body, cache: 'no-store' }); }
  catch { throw new Error('연결이 끊겼습니다. 입력한 내용은 유지됩니다. 다시 시도해 주세요.'); }
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || '요청을 처리할 수 없습니다. 다시 시도해 주세요.');
    error.status = response.status;
    throw error;
  }
  return data;
}
