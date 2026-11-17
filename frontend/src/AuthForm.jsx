import React, { useState } from 'react';
import { api } from './api';
export function AuthForm({ mode, onClose, onSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const signup = mode === 'signup';
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      if (signup) await api('/auth/register', { method: 'POST', data: { email, password } });
      else await api('/auth/login', { method: 'POST', form: { username: email.trim().toLowerCase(), password } });
      await onSuccess(signup);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  return <section className="form-panel" aria-labelledby="auth-title">
    <button className="text-button" onClick={onClose}>목록으로</button>
    <h1 id="auth-title">{signup ? '모임에 함께하세요' : '다시 만나 반가워요'}</h1>
    <p>{signup ? '계정을 만들고 나누고 싶은 이야기를 적어보세요.' : '로그인하고 이야기를 이어가세요.'}</p>
    <form onSubmit={submit}>
      <label>이메일<input type="email" value={email} onChange={e => setEmail(e.target.value)} required maxLength={254} autoComplete="username" /></label>
      <label>비밀번호<input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} maxLength={72} autoComplete={signup ? 'new-password' : 'current-password'} /></label>
      {signup && <small>8자 이상 입력해 주세요.</small>}
      {error && <p role="alert" className="error">{error}</p>}
      <button className="primary" disabled={busy}>{busy ? '처리 중…' : signup ? '가입하기' : '로그인하기'}</button>
    </form>
  </section>;
}
