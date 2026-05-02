const weights = {
  work: 0.22,
  parkingBenefit: 0.18,
  parkingCapacity: 0.16,
  access: 0.16,
  price: 0.12,
  lunch: 0.10,
  capacity: 0.06
};

const state = {
  venues: [],
  markers: [],
  map: null
};

const els = {
  search: document.getElementById("search"),
  area: document.getElementById("area-filter"),
  type: document.getElementById("type-filter"),
  sort: document.getElementById("sort-by"),
  freeParking: document.getElementById("free-parking-only"),
  workFriendly: document.getElementById("work-friendly-only"),
  verified: document.getElementById("verified-only"),
  list: document.getElementById("venue-list"),
  venueCount: document.getElementById("venue-count"),
  resultCount: document.getElementById("result-count"),
  bestWork: document.getElementById("best-work"),
  bestParking: document.getElementById("best-parking"),
  bestPrice: document.getElementById("best-price")
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

function scoreVenue(venue) {
  const s = venue.scores;
  return Object.entries(weights).reduce((sum, [key, weight]) => sum + s[key] * weight, 0);
}

function priceScore(price) {
  if (!price) return 5;
  if (price <= 2500) return 10;
  if (price <= 3500) return 8.5;
  if (price <= 4700) return 7;
  if (price <= 6000) return 5.5;
  return 4;
}

function normalizeVenue(venue) {
  const scores = { ...venue.scores, price: priceScore(venue.americanoPrice) };
  const normalized = { ...venue, scores };
  normalized.overall = Math.round(scoreVenue(normalized) * 10) / 10;
  return normalized;
}

function initMap() {
  state.map = L.map("map", { zoomControl: true }).setView([37.2706, 127.0817], 11);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap"
  }).addTo(state.map);

  L.circleMarker([37.3134, 127.0725], {
    radius: 8,
    color: "#ffffff",
    weight: 2,
    fillColor: "#bd3d44",
    fillOpacity: 1
  }).addTo(state.map).bindPopup("성복역 기준점");
}

function markerIcon(isTop) {
  const color = isTop ? "#2563eb" : "#5f6c7b";
  return L.divIcon({
    html: `<span style="display:block;width:14px;height:14px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.25)"></span>`,
    className: "venue-marker",
    iconSize: [18, 18],
    iconAnchor: [9, 9]
  });
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
    if (els.freeParking.checked && !venue.freeOrSupportedParking) return false;
    if (els.workFriendly.checked && venue.scores.work < 8) return false;
    if (els.verified.checked && venue.confidence === "확인필요") return false;
    return true;
  });

  const sortKey = els.sort.value;
  const selectors = {
    overall: (v) => v.overall,
    parking: (v) => (v.scores.parkingBenefit + v.scores.parkingCapacity) / 2,
    work: (v) => v.scores.work,
    price: (v) => v.scores.price,
    access: (v) => v.scores.access
  };

  return venues.sort((a, b) => selectors[sortKey](b) - selectors[sortKey](a));
}

function renderInsights(venues) {
  if (!venues.length) {
    els.bestWork.textContent = "-";
    els.bestParking.textContent = "-";
    els.bestPrice.textContent = "-";
    return;
  }

  els.bestWork.textContent = [...venues].sort((a, b) => b.scores.work - a.scores.work)[0].name;
  els.bestParking.textContent = [...venues].sort((a, b) => {
    const left = a.scores.parkingBenefit + a.scores.parkingCapacity;
    const right = b.scores.parkingBenefit + b.scores.parkingCapacity;
    return right - left;
  })[0].name;
  els.bestPrice.textContent = [...venues].sort((a, b) => a.americanoPrice - b.americanoPrice)[0].name;
}

function renderMap(venues) {
  for (const marker of state.markers) marker.remove();
  state.markers = [];

  venues.forEach((venue, index) => {
    const marker = L.marker([venue.lat, venue.lng], { icon: markerIcon(index < 5) })
      .addTo(state.map)
      .bindPopup(`<strong>${index + 1}위 ${escapeHtml(venue.name)}</strong><br>${venue.overall.toFixed(1)}점 · ${escapeHtml(venue.area)}`);
    state.markers.push(marker);
  });

  if (venues.length) {
    const group = L.featureGroup(state.markers);
    state.map.fitBounds(group.getBounds().pad(0.18), { maxZoom: 13 });
  }
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

function renderList(venues) {
  els.list.replaceChildren();
  els.resultCount.textContent = `${venues.length}개 표시`;

  venues.forEach((venue, index) => {
    const card = document.createElement("article");
    card.className = "venue-card";
    const price = venue.americanoPrice ? `${venue.americanoPrice.toLocaleString()}원` : "확인필요";
    const confidenceClass = venue.confidence === "검증됨" ? "good" : "warn";
    const sourceLinks = venue.sources.slice(0, 3).map((source, sourceIndex) =>
      `<a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">출처 ${sourceIndex + 1}</a>`
    ).join("");

    card.innerHTML = `
      <div class="venue-top">
        <div>
          <span class="rank">${index + 1}위</span>
          <h3>${escapeHtml(venue.name)}</h3>
          <div class="meta">${escapeHtml(venue.area)} · ${escapeHtml(venue.type)} · 아메리카노 ${price}</div>
        </div>
        <div class="score">
          <strong>${venue.overall.toFixed(1)}</strong>
          <span>종합</span>
        </div>
      </div>
      <div class="tags">
        <span class="tag ${confidenceClass}">${escapeHtml(venue.confidence)}</span>
        <span class="tag">${escapeHtml(venue.parkingSummary)}</span>
        ${venue.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}
      </div>
      <div class="score-grid">
        ${scoreLine("작업", venue.scores.work)}
        ${scoreLine("주차혜택", venue.scores.parkingBenefit)}
        ${scoreLine("주차여유", venue.scores.parkingCapacity)}
        ${scoreLine("접근성", venue.scores.access)}
        ${scoreLine("가격", venue.scores.price)}
        ${scoreLine("점심", venue.scores.lunch)}
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

function render() {
  const venues = filteredVenues();
  renderInsights(venues);
  renderMap(venues);
  renderList(venues);
}

async function main() {
  initMap();
  const response = await fetch("data/venues.json");
  const data = await response.json();
  state.venues = data.venues.map(normalizeVenue).sort((a, b) => b.overall - a.overall);
  els.venueCount.textContent = state.venues.length;
  fillFilters(state.venues);

  for (const el of [els.search, els.area, els.type, els.sort, els.freeParking, els.workFriendly, els.verified]) {
    el.addEventListener("input", render);
    el.addEventListener("change", render);
  }

  render();
}

main().catch((error) => {
  console.error(error);
  els.list.textContent = "데이터를 불러오지 못했습니다. 로컬에서는 HTTP 서버로 실행해 주세요.";
});
