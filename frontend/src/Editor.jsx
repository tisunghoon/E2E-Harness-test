import React, { useState } from 'react';
import { api } from './api';
export function Editor({ post, onCancel, onSaved }) {
  const [title, setTitle] = useState(post?.title || '');
  const [body, setBody] = useState(post?.body || '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    if (!title.trim() || !body.trim()) { setError('제목과 본문을 모두 입력해 주세요.'); return; }
    setBusy(true); setError('');
    try { onSaved(await api(post ? `/posts/${post.id}` : '/posts', { method: post ? 'PUT' : 'POST', data: { title, body } })); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  return <section className="editor">
    <button className="text-button" onClick={onCancel}>돌아가기</button>
    <h1>{post ? '이야기 수정하기' : '새로운 이야기'}</h1>
    <form onSubmit={submit}>
      <label>제목<input value={title} onChange={e => setTitle(e.target.value)} maxLength={120} required placeholder="어떤 이야기를 나누고 싶나요?" /></label>
      <label>본문<textarea value={body} onChange={e => setBody(e.target.value)} maxLength={10000} required rows={12} placeholder="생각을 편하게 적어보세요." /></label>
      <small>{body.length.toLocaleString()} / 10,000</small>
      {error && <p role="alert" className="error">{error}</p>}
      <div className="actions"><button type="button" className="secondary" onClick={onCancel}>취소</button><button className="primary" disabled={busy}>{busy ? '저장 중…' : post ? '수정 저장' : '게시하기'}</button></div>
    </form>
  </section>;
}
