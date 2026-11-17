import React, { useEffect, useState } from 'react';
import { api } from './api';
import { AuthForm } from './AuthForm';
import { Editor } from './Editor';

export default function App() {
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [post, setPost] = useState(null);
  const [view, setView] = useState('loading');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  async function loadUser() {
    try { setUser(await api('/auth/me')); }
    catch (err) { if (err.status !== 401) setError(err.message); setUser(null); }
    finally { setAuthReady(true); }
  }
  async function showList() {
    setError(''); setDeleting(false); setView('loading');
    window.history.replaceState({}, '', '/');
    try { setPosts(await api('/posts')); setPost(null); setView('list'); }
    catch (err) { setError(err.message); setView('list'); }
  }
  async function showPost(id) {
    setError(''); setDeleting(false); setView('loading');
    window.history.replaceState({}, '', `/?post=${id}`);
    try { setPost(await api(`/posts/${id}`)); setView('detail'); }
    catch (err) { setError(err.message); setPost(null); setView('missing'); }
  }
  useEffect(() => {
    loadUser();
    const id = new URLSearchParams(window.location.search).get('post');
    if (id) showPost(id); else showList();
  }, []);
  async function logout() {
    setBusy(true);
    try { await api('/auth/logout', { method: 'POST' }); setUser(null); setMessage('로그아웃되었습니다.'); await showList(); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  async function deletePost() {
    setBusy(true);
    try { await api(`/posts/${post.id}`, { method: 'DELETE' }); setMessage('글을 삭제했습니다.'); await showList(); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  function write() { setError(''); setMessage(''); setView(user ? 'create' : 'login'); }
  const date = value => new Date(value).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
  return <>
    <header><div className="header-inner">
      <button className="brand" onClick={showList} aria-label="모임 홈"><span className="brand-mark" aria-hidden="true">m</span>모임</button>
      <span className="header-caption">작은 생각이 모이는 곳</span>
      <nav aria-label="회원 메뉴">{authReady && (user ? <><span data-testid="current-user" className="user-email">{user.email}</span><button className="text-button" onClick={logout} disabled={busy}>로그아웃</button></> : <><button className="text-button" onClick={() => { setError(''); setView('login'); }}>로그인</button><button className="secondary" onClick={() => { setError(''); setView('signup'); }}>회원가입</button></>)}</nav>
    </div></header>
    <main>
      {message && <div role="status" className="notice">{message}<button aria-label="알림 닫기" onClick={() => setMessage('')}>×</button></div>}
      {error && <div role="alert" className="error">{error}<button className="text-button" onClick={showList}>목록 다시 불러오기</button></div>}
      {view === 'loading' && <p role="status" className="loading">이야기를 불러오고 있습니다…</p>}
      {(view === 'login' || view === 'signup') && <AuthForm key={view} mode={view} onClose={showList} onSuccess={async signup => {
        setMessage(signup ? '가입이 완료되었습니다. 로그인해 주세요.' : '로그인되었습니다.');
        await loadUser(); if (signup) setView('login'); else await showList();
      }} />}
      {(view === 'create' || view === 'edit') && <Editor key={view} post={view === 'edit' ? post : null} onCancel={() => post ? showPost(post.id) : showList()} onSaved={saved => { setMessage('글을 저장했습니다.'); showPost(saved.id); }} />}
      {view === 'list' && <>
        <section className="intro"><div><p className="intro-note">반가워요, 여기는 모임입니다.</p><h1>함께 나누는 이야기</h1><p>오늘의 발견부터 오래 품었던 생각까지,<br/>당신의 이야기를 들려주세요.</p></div><div className="intro-art" aria-hidden="true"><span>함께</span><span>나누다.</span><i/></div></section>
        <div className="board-layout"><section aria-label="게시글 목록" className="post-list"><div className="list-heading"><h2>모든 이야기</h2><span>{posts.length}개의 글</span></div>
          {posts.length === 0 ? <div className="empty"><span className="empty-symbol" aria-hidden="true">✎</span><h3>첫 이야기를 기다리고 있어요</h3><p>소소한 생각도 좋아요. 모임의 첫 글을 남겨보세요.</p><button className="primary" onClick={write}>글 쓰기</button></div> : posts.map(item => <button className="post-row" key={item.id} onClick={() => showPost(item.id)}><span className="post-meta">{date(item.createdAt)}{user?.id === item.authorId && <em>내 글</em>}</span><h3>{item.title}</h3><p>{item.body}</p><span className="read-label">이야기 읽기 ↗</span></button>)}
        </section><aside><div className="write-card"><span className="small-mark" aria-hidden="true">✳</span><h2>당신의 생각도<br/>궁금해요.</h2><p>읽기는 누구나,<br/>이야기는 로그인 후 함께.</p><button className="primary" onClick={write}>글 쓰기</button></div><p className="aside-note">서로를 존중하는 말로<br/>편하게 이야기를 나눠요.</p></aside></div>
      </>}
      {view === 'detail' && post && <article className="detail"><button className="text-button" onClick={showList}>목록으로</button><p className="post-meta">{date(post.createdAt)} · {user?.id === post.authorId ? '내가 쓴 이야기' : '모임 회원의 이야기'}</p><h1>{post.title}</h1><div className="post-body" data-testid="post-body">{post.body}</div>{user?.id === post.authorId && <div className="detail-actions"><button className="secondary" onClick={() => setView('edit')}>수정</button><button className="text-button danger" onClick={() => setDeleting(true)}>삭제</button></div>}{deleting && <section className="delete-confirm" role="alertdialog" aria-label="글 삭제 확인"><p>이 글을 삭제할까요? 삭제한 글은 되돌릴 수 없습니다.</p><button className="secondary" onClick={() => setDeleting(false)}>취소</button><button className="primary danger-bg" disabled={busy} onClick={deletePost}>삭제 확인</button></section>}</article>}
      {view === 'missing' && <div className="empty"><h1>이 이야기를 찾을 수 없어요</h1><p>삭제되었거나 주소가 잘못되었을 수 있습니다.</p><button className="primary" onClick={showList}>모든 이야기 보기</button></div>}
    </main><footer><span>모임</span><p>생각을 나누면, 이야기가 됩니다.</p></footer>
  </>;
}
