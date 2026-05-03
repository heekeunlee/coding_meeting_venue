const weights = {
  travelFairness: 0.30,
  parking: 0.28,
  work: 0.18,
  price: 0.12,
  weekendCalm: 0.07,
  lunch: 0.05
};

const state = {
  origins: [],
  venues: [],
  excluded: []
};

const els = {
  search: document.getElementById("search"),
  area: document.getElementById("area-filter"),
  type: document.getElementById("type-filter"),
  sort: document.getElementById("sort-by"),
  parkingOnly: document.getElementById("parking-only"),
  priceOnly: document.getElementById("price-only"),
  verifiedOnly: document.getElementById("verified-only"),
  list: document.getElementById("venue-list"),
  excluded: document.getElementById("excluded-list"),
  venueCount: document.getElementById("venue-count"),
  resultCount: document.getElementById("result-count"),
  bestOverall: document.getElementById("best-overall"),
  bestTravel: document.getElementById("best-travel"),
  bestParking: document.getElementById("best-parking"),
  weightChart: document.getElementById("weight-chart"),
  originList: document.getElementById("origin-list")
};

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  })[char]);
}

function haversineKm(a, b) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const lat1 = a.lat * rad;
  const lat2 = b.lat * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function estimateDriveMinutes(km) {
  return Math.max(7, Math.round(km * 2.1 + 6));
}

function priceScore(price) {
  if (price <= 2500) return 10;
  if (price <= 3500) return 9;
  if (price <= 4700) return 8.5;
  if (price <= 5000) return 7.5;
  return 4;
}

function travelScore(maxMinutes, averageMinutes, spreadMinutes) {
  const maxComponent = Math.max(0, 10 - (maxMinutes - 12) * 0.23);
  const averageComponent = Math.max(0, 10 - (averageMinutes - 10) * 0.25);
  const spreadComponent = Math.max(0, 10 - spreadMinutes * 0.18);
  return Math.round((maxComponent * 0.45 + averageComponent * 0.35 + spreadComponent * 0.20) * 10) / 10;
}

function normalizeVenue(venue) {
  const trips = state.origins.map((origin) => {
    const km = haversineKm(origin, venue);
    return {
      originId: origin.id,
      originName: origin.name,
      km: Math.round(km * 10) / 10,
      minutes: estimateDriveMinutes(km)
    };
  });
  const minutes = trips.map((trip) => trip.minutes);
  const averageMinutes = Math.round(minutes.reduce((a, b) => a + b, 0) / minutes.length);
  const maxMinutes = Math.max(...minutes);
  const minMinutes = Math.min(...minutes);
  const spreadMinutes = maxMinutes - minMinutes;
  const scores = {
    ...venue.scores,
    price: priceScore(venue.americanoPrice),
    travelFairness: travelScore(maxMinutes, averageMinutes, spreadMinutes)
  };
  const overall = Object.entries(weights).reduce((sum, [key, weight]) => sum + scores[key] * weight, 0);
  return {
    ...venue,
    trips,
    averageMinutes,
    maxMinutes,
    spreadMinutes,
    scores,
    overall: Math.round(overall * 10) / 10
  };
}

function fillFilters(venues) {
  const areas = [...new Set(venues.map((v) => v.area))].sort();
  const types = [...new Set(venues.map((v) => v.type))].sort();
  for (const area of areas) {
    const option = document.createElement("option");
    option.value = area;
    option.textContent = area;
    els.area.appendChild(option);
  }
  for (const type of types) {
    const option = document.createElement("option");
    option.value = type;
    option.textContent = type;
    els.type.appendChild(option);
  }
}

function filteredVenues() {
  const q = els.search.value.trim().toLowerCase();
  const area = els.area.value;
  const type = els.type.value;

  const venues = state.venues.filter((venue) => {
    const text = `${venue.name} ${venue.area} ${venue.type} ${venue.notes} ${venue.tags.join(" ")}`.toLowerCase();
    if (q && !text.includes(q)) return false;
    if (area !== "all" && venue.area !== area) return false;
    if (type !== "all" && venue.type !== type) return false;
    if (els.parkingOnly.checked && venue.parkingSpaces < 20) return false;
    if (els.priceOnly.checked && venue.americanoPrice > 5000) return false;
    if (els.verifiedOnly.checked && venue.confidence !== "검증됨") return false;
    return true;
  });

  const selectors = {
    overall: (v) => v.overall,
    travel: (v) => v.scores.travelFairness,
    parking: (v) => v.scores.parking,
    work: (v) => v.scores.work,
    price: (v) => v.scores.price
  };

  return venues.sort((a, b) => selectors[els.sort.value](b) - selectors[els.sort.value](a));
}

function renderInsights(venues) {
  if (!venues.length) {
    els.bestOverall.textContent = "-";
    els.bestTravel.textContent = "-";
    els.bestParking.textContent = "-";
    return;
  }
  els.bestOverall.textContent = venues[0].name;
  els.bestTravel.textContent = [...venues].sort((a, b) => b.scores.travelFairness - a.scores.travelFairness)[0].name;
  els.bestParking.textContent = [...venues].sort((a, b) => b.scores.parking - a.scores.parking)[0].name;
}

function scoreLine(label, value) {
  return `
    <div class="score-line">
      <span>${label}</span>
      <div class="bar"><span style="width:${value * 10}%"></span></div>
      <b>${value}</b>
    </div>
  `;
}

function renderWeights() {
  const labels = {
    travelFairness: "이동 균형",
    parking: "주차",
    work: "노트북 작업성",
    price: "가격",
    weekendCalm: "혼잡 회피",
    lunch: "점심 연계"
  };
  els.weightChart.replaceChildren();
  Object.entries(weights).forEach(([key, weight]) => {
    const item = document.createElement("div");
    item.className = "weight-item";
    item.innerHTML = `
      <div>
        <strong>${labels[key]}</strong>
        <span>${Math.round(weight * 100)}%</span>
      </div>
      <div class="weight-bar"><span style="width:${weight * 100}%"></span></div>
    `;
    els.weightChart.appendChild(item);
  });
}

function renderOrigins() {
  els.originList.replaceChildren();
  state.origins.forEach((origin) => {
    const item = document.createElement("div");
    item.className = "origin-item";
    item.innerHTML = `
      <strong>${escapeHtml(origin.name)}</strong>
      <span>${origin.lat.toFixed(3)}, ${origin.lng.toFixed(3)}</span>
    `;
    els.originList.appendChild(item);
  });
}

function renderTrips(venue) {
  return venue.trips.map((trip) => `
    <div class="trip">
      <span>${escapeHtml(trip.originName)}</span>
      <strong>${trip.minutes}분</strong>
      <small>${trip.km}km</small>
    </div>
  `).join("");
}

function renderList(venues) {
  els.list.replaceChildren();
  els.resultCount.textContent = `${venues.length}개 표시`;

  venues.forEach((venue, index) => {
    const card = document.createElement("article");
    card.className = "venue-card";
    const sourceLinks = venue.sources.slice(0, 3).map((source, sourceIndex) =>
      `<a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">출처 ${sourceIndex + 1}</a>`
    ).join("");

    card.innerHTML = `
      <div class="venue-top">
        <div>
          <span class="rank">${index + 1}위</span>
          <h3>${escapeHtml(venue.name)}</h3>
          <div class="meta">${escapeHtml(venue.area)} · ${escapeHtml(venue.type)} · ${escapeHtml(venue.openTime)} · 아메리카노 ${venue.americanoPrice.toLocaleString()}원</div>
        </div>
        <div class="score">
          <strong>${venue.overall.toFixed(1)}</strong>
          <span>평균 ${venue.averageMinutes}분 · 최대 ${venue.maxMinutes}분</span>
        </div>
      </div>
      <div class="tags">
        <span class="tag good">주차 ${venue.parkingSpaces}대 이상</span>
        <span class="tag good">${escapeHtml(venue.parkingSummary)}</span>
        ${venue.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}
      </div>
      <div class="trip-grid">
        ${renderTrips(venue)}
      </div>
      <div class="score-grid">
        ${scoreLine("이동균형", venue.scores.travelFairness)}
        ${scoreLine("주차", venue.scores.parking)}
        ${scoreLine("작업성", venue.scores.work)}
        ${scoreLine("가격", venue.scores.price)}
        ${scoreLine("혼잡회피", venue.scores.weekendCalm)}
        ${scoreLine("식사", venue.scores.lunch)}
      </div>
      <p class="notes">${escapeHtml(venue.notes)}</p>
      <div class="actions">
        <a class="primary" href="https://map.naver.com/p/search/${encodeURIComponent(venue.mapQuery)}" target="_blank" rel="noreferrer">네이버지도</a>
        <a href="https://map.kakao.com/link/search/${encodeURIComponent(venue.mapQuery)}" target="_blank" rel="noreferrer">카카오맵</a>
        ${sourceLinks}
      </div>
    `;
    els.list.appendChild(card);
  });
}

function renderExcluded() {
  els.excluded.replaceChildren();
  state.excluded.forEach((item) => {
    const card = document.createElement("article");
    card.className = "excluded-card";
    card.innerHTML = `
      <strong>${escapeHtml(item.name)}</strong>
      <p>${escapeHtml(item.reason)}</p>
      ${item.source ? `<a href="${escapeHtml(item.source)}" target="_blank" rel="noreferrer">근거 보기</a>` : ""}
    `;
    els.excluded.appendChild(card);
  });
}

function render() {
  const venues = filteredVenues();
  renderInsights(venues);
  renderList(venues);
}

async function main() {
  const response = await fetch("data/venues.json");
  const data = await response.json();
  state.origins = data.origins;
  state.excluded = data.excludedExamples || [];
  state.venues = data.venues.map(normalizeVenue).sort((a, b) => b.overall - a.overall);
  els.venueCount.textContent = state.venues.length;
  fillFilters(state.venues);
  renderWeights();
  renderOrigins();
  renderExcluded();

  for (const el of [els.search, els.area, els.type, els.sort, els.parkingOnly, els.priceOnly, els.verifiedOnly]) {
    el.addEventListener("input", render);
    el.addEventListener("change", render);
  }

  render();
}

main().catch((error) => {
  console.error(error);
  els.list.textContent = "데이터를 불러오지 못했습니다. 로컬에서는 HTTP 서버로 실행해 주세요.";
});
