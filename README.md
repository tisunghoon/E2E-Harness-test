# 모임 · 회원 게시판

Spring Boot·React로 구현한 회원 게시판. 실제 UI/API/DB를 연결하는 INT-01~05 검증용 프로젝트다.

배포 주소: https://e2e-harness-board.vercel.app
백엔드 상태: https://api-production-8a96697e.up.railway.app/api/health

## 실행

Java 21, Gradle 9.2.1, Node 22.12 이상 필요. 패키지는 package-lock.json으로 고정한다.

```sh
npm ci
gradle -p backend bootJar copyH2
PORT=18080 java -jar backend/build/libs/board.jar
```

별도 터미널에서 `npm run dev` 후 http://127.0.0.1:5173 접속.
DB 기본 경로는 실행 디렉터리의 data/board. 운영에서 반드시 영속 볼륨 경로를 지정한다.

## 통합 검증

검증 전에 위 수동 서버와 Vite를 종료한다. 테스트는 포트 18080/5173을 전용으로 사용한다.

```sh
npx playwright install chromium
gradle -p backend bootJar copyH2
npm run build
npm test
```

- INT-01: 회원→작성→비회원 조회→수정→삭제.
- INT-02: 두 회원의 소유권, 직접 요청 거절, 각자 정상 수정.
- INT-03: 로그아웃 전 자격 재사용·비회원 쓰기 거절, 재로그인.
- INT-04: 실제 JVM 종료/재기동 후 회원·수정·삭제·작성자 유지.
- INT-05: 중복 가입·잘못된 작성/수정의 저장 불변, 정상 요청 복구.

각 시나리오는 운영과 분리된 새 임시 H2 DB로 시작한다. INT-04만 같은 DB를 유지하며 재기동한다.
DB 읽기 전용 SELECT 결과·검사 JSON은 evidence/local에 남는다. 비밀번호·쿠키는 출력하지 않으며 브라우저 trace도 저장하지 않는다.
시나리오 종료 시 JVM은 종료하고 임시 DB는 진단용으로 남긴다. 운영 DB를 초기화하는 엔드포인트는 없다.
AUTH 8개와 BOARD 11개 독립 시나리오는 실행하지 않는다. 5개 성공은 전체 24개 성공이 아니다.

## 구현 계약과 운영

- [설계·구현 계획](docs/implementation.md): API·인증·입력·파일 책임.
- [배포·복구 실행안](docs/deployment.md): 무료 플랜·영속 볼륨·확인 및 중단 기준.
- [작업 정본](https://app.notion.com/p/41b04552316d8079a925f96a7f3a8024)
- [테스트 명세](https://app.notion.com/p/41b04552316d81a691c9e45a03ae3bea)
- [이슈·PR 템플릿 정본](https://app.notion.com/p/41b04552316d81af940acce869ad8477)

공개 목록은 최신 작성순, 상세는 `/?post=<UUID>`. 회원가입 뒤 별도 로그인한다.
로그아웃은 현재 서버 세션을 폐기한다. 재기동 시 재로그인이 필요하다.
프론트는 일반 텍스트를 렌더링하며 본문 HTML을 실행하지 않는다.
단일 서버·파일 DB이므로 고가용성·부하 대응·백업 복구는 보장하지 않는다.
실제 배포 검증·무료 계정 잔여량·사용자 수용은 로컬 테스트와 구분한다.
