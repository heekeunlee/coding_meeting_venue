# coding_meeting_venue

용인·수원 일대에서 오전 7:30 이전 오픈하고 무료 또는 구매 시 무료/지원 주차가 20대 이상 가능한 주말 코딩 소모임 장소를 비교하는 정적 웹앱입니다.

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

장소 정보는 공개 웹 정보와 리뷰 기반이라, 영업시간·주차 정책·가격은 방문 전 재확인이 필요합니다.
