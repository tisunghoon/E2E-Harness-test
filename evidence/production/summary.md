# 실제 배포·중단·복구 검증

2026-11-17 KST. 로컬 INT-01~05 5개와 별도로 승인된 운영 검증이다.

- 서비스: https://e2e-harness-board.vercel.app
- API: https://api-production-8a96697e.up.railway.app/api/health
- Vercel: 개인 Hobby, dpl_4xG33u5G2PmNpfGSzbXLzxP22j36, Ready, api/proxy 함수 포함.
- Railway: 무료 trial, api 단일 서비스, /data 500MB 볼륨. 유료 전환·결제 추가 없음.

## 결과

- baseline.json: 가입·로그인·글 작성/조회/수정·작성자 연결·로그아웃 통과. HttpOnly/Secure 세션과 CSRF 쓰기 확인.
- observation.json: 300초 동안 30초 간격 11회, health 및 게시글 조회 22건 모두 HTTP 200과 응답 구조 정상. 연속 무중단 모니터링이나 부하 시험은 아님.
- outage.json: 서비스 배포 중단 1회. API health 404 및 UI 오류 안내 확인.
- recovery.json: 기존 회원 ID, 게시글 ID, 수정 내용, 작성자 유지. 재로그인·새 수정·로그아웃 통과.
- recovery-timing.json: 복구 요청 13:35:21.836 UTC → health 정상 확인 13:35:56.480 UTC, 34.64초. 중단 요청부터 정상 확인까지 42.87초이며 정확한 장애 시작/종료 시각은 폴링 간격의 오차가 있다.
- railway-deployments.json: 최초와 복구 이미지 digest 동일, /data 마운트 유지. 복구 배포 SUCCESS.

## 실패와 실제 복구 경로

Vercel 최초 연결이 추가한 experimentalServices 때문에 API 함수가 제외되고 출력 경로가 dist로 해석되어 첫 빌드 실패.
자동 설정을 제거한 기존 vercel.json으로 재배포 성공. 프론트 소스 변경은 없었다.

Railway down 이후 redeploy는 `No deployment found for service`로 실패했다.
실행자가 즉시 `railway up --detach --json --message recovery-same-source`로 동일 소스를 올렸다.
Docker 캐시로 최초와 같은 이미지 digest가 생성됐고, 진행 중이던 복구 관찰/데이터 검사가 정상 완료됐다.
원본 timing JSON은 이 실패를 그대로 보존한다. 수동 복구 배포 ID는 09603d4d-e42c-4d51-a027-bc47794161ac.
이후 스크립트에 같은 fallback을 반영했으며, 추가 장애 주입은 하지 않았다. fallback 자동 분기 전체 재실행은 미검증이다.

## 한계와 후속 운영

- 단일 H2 파일/볼륨. 백업 복원·볼륨 손상·삭제 복구·고가용성 검증이 아니다.
- 재기동 시 세션은 만료된다. DB 파일과 계정/글만 지속된다.
- Railway 사용량은 무료 크레딧을 소비한다. 장기 무료 유지·장기 가용성을 보장하지 않는다.
- GitHub 자동 배포 미연결. 현재 소스 직접 배포이며 향후 배포도 별도 수행해야 한다.
- Railway CLI는 railway.json 지원 종료 예정일을 2026-12-01로 안내했다. 이후 재배포 전 IaC 마이그레이션 필요.
- 합성 자격·원문 암호·쿠키는 공개 증거에 포함하지 않는다.
