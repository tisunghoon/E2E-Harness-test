# 배포·장애 복구 실행안

2026-11-17 사용자 승인: 현재 배포 상태 확인 → 실제 배포 → 장애 중단·복구 검증 → 마지막에 PR 생성. 병합은 승인 범위에 포함하지 않는다. 무료 한도 유지.
정본: https://app.notion.com/p/41504552316d810796f1f506ba90d1c2

## 배포 범위

- Railway 무료 프로젝트 서비스 1개, H2 영속 볼륨 /data, 인스턴스 1개.
- Vercel Hobby 프론트·동일 출처 프록시. RAILWAY_ORIGIN은 Railway의 HTTPS 도메인.
- Railway 설정: APP_DB_URL=jdbc:h2:file:/data/board, DB_PASSWORD는 새 비밀값, COOKIE_SECURE=true.
- 무료 한도는 계정별 잔여량을 확인한다. 유료 플랜·결제 추가·한도 증액은 하지 않는다.
- 로컬 통과 결과는 배포 통과가 아니다. Linux 컨테이너와 실제 Vercel 프록시도 확인해야 한다.
- 최초 배포라 이전 정상 운영 버전은 없다. 실패하면 새 서비스 공개를 중단하고 설정/코드를 수정한다.

## 승인 후 순서

1. 현재 배포 상태·계정·무료 잔여량 확인. 로컬 검증된 소스를 직접 배포하고 PR은 운영 검증 뒤 생성.
2. Railway에 이 저장소 Dockerfile로 서비스 생성, 볼륨·비밀 설정·도메인 준비.
3. /api/health 200 확인, DB 경로와 볼륨 확인. 영속 볼륨 없는 배포는 금지.
4. Vercel에 이 저장소 연결, RAILWAY_ORIGIN 설정 후 배포.
5. HTTPS UI에서 새 합성 회원/글로 작성·조회·수정·로그아웃 확인. 쿠키 HttpOnly/Secure와 CSRF 정상 여부 확인.
6. 승인된 장애 창에서 Railway 서비스를 일시 중단해 UI 연결 오류를 관찰한다. DB나 볼륨은 삭제하지 않는다.
7. 같은 버전·볼륨으로 재시작. health, 재로그인, 기존 글과 작성자, 새 쓰기 확인.
8. 종료 시 정상 동작·운영 버전·비용 잔여량·복구 소요시간 기록.

## 제안한 정상·중단 기준

- 정상: health 200, 핵심 쓰기/읽기 성공, 기존 데이터 불변. 5분 관찰 중 핵심 경로 실패 없음.
- 중단: 데이터 유실·권한 우회·예상 과금 발생, 또는 2분 내 health 복구 실패.
- 장애는 서비스 1개 중단/재개 1회로 제한하고 합성 데이터만 사용한다.
- 사용자가 실제 배포·장애 복구 검증을 승인했다. 실행 결과는 evidence/production에 별도 기록한다.

## 복구 한계

앱 재기동은 데이터 백업이 아니다. 단일 H2 파일/볼륨 구성은 고가용성을 제공하지 않는다.
볼륨 손상·삭제 복구는 이번 중단/재개 시험의 범위 밖이며, 검증된 백업 복구를 주장하지 않는다.
회원 인증 세션은 재기동 후 만료되므로 다시 로그인한다. 회원과 게시글은 볼륨에 유지된다.

## 배포 설정과 재현

- Vercel 개인 workspace: tisunghoon-s-projects, 프로젝트 e2e-harness-board, Hobby.
- Railway 프로젝트 e2e-harness-board, production/api, 500MB /data 볼륨. 무료 trial 크레딧을 사용하며 유료 전환하지 않았다.
- DB_PASSWORD는 최초 한 번 무작위 생성해 Railway Variables에 저장했다. 재배포 때 새로 생성하지 않는다. DB 내부 암호와 환경변수는 일치해야 한다.
- Vercel production 환경변수 RAILWAY_ORIGIN은 위 Railway 도메인이다. 이후 배포에도 유지된다.
- Vercel CLI 첫 연결의 자동 experimentalServices 설정이 기존 출력 디렉터리와 api/ 함수를 무시해 첫 배포가 실패했다. 자동 추가 설정을 제거한 기존 vercel.json으로 배포에 성공했다.
- .vercelignore는 백엔드 빌드·테스트·운영 검증 자격 파일이 프론트 배포에 포함되는 것을 막는다.
- GitHub 로그인 연결은 개인 Vercel 계정에 추가하지 않았다. 현재 로컬 소스 직접 배포이며 Git push 자동 배포는 구성하지 않았다.
- Railway CLI는 railway.json 지원 종료 예정일을 2026-12-01로 안내했다. 이후 재배포 전 IaC 마이그레이션이 필요하다.

```sh
node scripts/cloud-check.mjs baseline https://e2e-harness-board.vercel.app
node scripts/cloud-observe.mjs https://e2e-harness-board.vercel.app
# 승인된 장애 창에서만 실행: 배포 중단 후 같은 이미지로 재배포
python3 scripts/cloud-recovery.py
```

baseline은 합성 회원과 글을 생성한다. 재실행 시 새 데이터가 생긴다.
evidence/local/cloud-state.json은 복구 검사 전용 자격을 포함하며 Git과 Vercel 배포에서 제외된다.
공유 가능한 결과·스크린샷은 evidence/production에 저장한다.
