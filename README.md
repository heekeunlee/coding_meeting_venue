# coding_meeting_venue

용인수지, 용인신갈, 수원망포, 수원매탄 4명이 매주 일요일 코딩 소모임을 하기 좋은 장소를 비교하는 정적 웹앱입니다.

## 구조

- `index.html`: 앱 셸
- `src/app.js`: 필터, 정렬, 지도, 점수 계산
- `src/styles.css`: 반응형 UI
- `data/venues.json`: 장소 후보와 출처 데이터
- `scripts/validate-data.js`: 데이터 품질 검증

## 로컬 실행

```bash
python3 -m http.server 8000
```

브라우저에서 `http://localhost:8000`을 엽니다.

## 데이터 검증

```bash
node scripts/validate-data.js
```

장소 정보는 공개 웹 정보와 리뷰 기반이며, 이동시간은 좌표 기반 추정치입니다. 실제 방문 전에는 지도 앱과 매장 공지로 재확인해야 합니다.
