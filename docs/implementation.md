# 회원 게시판 구현 계획 · 승인 2026-11-17

목적: 회원 게시판을 제작하며 풀스택 워크플로우를 실제로 실행한다.
정본: https://app.notion.com/p/41b04552316d8079a925f96a7f3a8024
사례: https://app.notion.com/p/41b04552316d81a691c9e45a03ae3bea
템플릿: https://app.notion.com/p/41b04552316d81af940acce869ad8477
템플릿 전문은 복제하지 않는다. 이 파일은 구현 고유의 계약·실행계획이다.

## 계약 v1

- Spring Boot / Java 21, React / Vite. 메인 수행자가 순차 구현한다.
- H2 파일 DB. 배포 시 /data 영속 볼륨 필수, 단일 인스턴스. 외부 DB 서비스 비용을 피한다.
- Spring Security 서버 세션, HttpOnly 쿠키, CSRF 헤더. 로그아웃은 서버 세션을 폐기한다.
- Vercel에서 /api를 Railway로 프록시해 동일 출처 인증을 사용한다.
- 이메일은 trim/lowercase, 비밀번호 8~72자, BCrypt 저장. 회원 ID는 UUID 문자열.
- 게시글 ID UUID, 작성자 서버 결정, 제목 1~120자·본문 1~10000자, 공백만 입력 거절.
- 목록은 최신순, 공개 읽기. 작성·수정·삭제 회원 전용, 수정·삭제는 소유자만 가능.
- 댓글·검색·첨부 없음. 인증/게시판 독립 시나리오 19개는 실행하지 않는다.
- INT-01~05만 검사. 운영 배포·장애 복구는 별도 결과. 전체 24개 통과로 보고하지 않는다.
- 무료 플랜만, 오늘 제작 목표. PR/병합/배포/장애 주입은 결과를 준비한 뒤 사용자 검토.

## API

모든 경로 /api 아래. 응답은 JSON, 오류는 {message}. 인증 비밀값은 증거에 저장하지 않는다.

| 경로 | 입력 / 결과 |
| --- | --- |
| GET /csrf | {token, headerName} |
| POST /auth/register | JSON {email,password} → 201 {id,email} / 400 / 409 |
| POST /auth/login | form username,password → 200 / 401 |
| GET /auth/me | {id,email} / 401 |
| POST /auth/logout | CSRF 필요 → 204, 세션 무효화 |
| GET /posts | [{id,authorId,title,body,createdAt}] |
| GET /posts/{id} | 게시글 / 404 |
| POST /posts | {title,body} → 201 게시글 |
| PUT /posts/{id} | {title,body} → 게시글 / 403 / 404 |
| DELETE /posts/{id} | 204 / 403 / 404 |

## 실행 순서

1. 실행 환경: backend/build.gradle, frontend/vite.config.js. bootJar와 프론트 빌드.
2. 검증을 먼저 작성: e2e/integration.spec.js의 5개 시나리오. 빈 앱에서 실패 확인.
3. 인증: SecurityConfig, AuthController. INT 흐름의 가입/로그인/로그아웃 연결.
4. 게시글: PostController, schema.sql. 서버 권한·원자적 저장·검증.
5. 화면: App.jsx, api.js, styles.css. 목록/상세/회원/편집, 오류·빈값·로딩.
6. 전체 INT 5개: 실제 Chromium, 직접 요청, 읽기 전용 DB 조회, 실제 JVM 재기동.
7. 배포 설정/복구 문서. 최종 리뷰·검사 후 PR 승인 요청. push는 사용자 수행.

각 논리 단위를 커밋하며 400줄보다 크면 분할한다. 잠금 파일 등 생성물은 별도 커밋한다.
테스트가 빠진 위험은 리뷰에 남긴다: 동시 수정, 로그인 남용, 데이터량 증가, 세션 만료 중 편집, 무료 한도 소진.
화면: 흰 배경, 파란 강조(#3155d9), 진한 글자(#18233b), 보조 회색(#657089), 옅은 파랑(#eef2ff).
한글 시스템 sans 글꼴, 넓은 목록과 우측 작성 안내, 모바일 단일 열. 제품 화면에 개발 지표를 노출하지 않는다.
