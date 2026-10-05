const map = L.map('map', { zoomControl: true }).setView([36.35, 127.8], 7);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

const state = { hospitals: [], markers: [], filter: 'all', query: '' };
const defaultLocations = {
  서울: [37.5665, 126.978], 경기: [37.4138, 127.5183], 인천: [37.4563, 126.7052], 강원: [37.8228, 128.1555],
  충북: [36.6357, 127.4917], 충남: [36.5184, 126.8], 대전: [36.3504, 127.3845], 세종: [36.48, 127.289],
  전북: [35.8203, 127.1088], 전남: [34.8679, 126.991], 광주: [35.1595, 126.8526], 경북: [36.576, 128.5056],
  대구: [35.8714, 128.6014], 경남: [35.4606, 128.2132], 부산: [35.1796, 129.0756], 울산: [35.5384, 129.3114], 제주: [33.4996, 126.5312]
};

const escapeHtml = value => String(value || '-').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
const isSupported = hospital => String(hospital.support).toLowerCase() === 'yes' || hospital.support === '1';
const coordsFor = (hospital, index) => {
  const valid = Number.isFinite(Number(hospital.latitude)) && Number.isFinite(Number(hospital.longitude));
  const placeholder = Number(hospital.latitude) === 37.566 && Number(hospital.longitude) === 127;
  if (valid && !placeholder) return [Number(hospital.latitude), Number(hospital.longitude)];
  const region = String(hospital.region || '').split('/')[0].trim();
  const base = defaultLocations[region] || [36.35, 127.8];
  return [base[0] + ((index * 17) % 9 - 4) * 0.012, base[1] + ((index * 11) % 9 - 4) * 0.015];
};
const popup = hospital => `<div class="popup"><h3>${escapeHtml(hospital.name)}</h3><p><strong>지역</strong> ${escapeHtml(hospital.region)}</p><p class="support ${isSupported(hospital) ? 'yes' : 'no'}">${isSupported(hospital) ? '● 진료 지원 가능' : '● 진료 지원 불가'}</p><p><strong>유형</strong> ${escapeHtml(hospital.type)}</p><p><strong>지원 범위</strong><br>${escapeHtml(hospital.support_range)}</p><p><strong>진료 금액</strong><br>${escapeHtml(hospital.amount)}</p><p><strong>필요 서류</strong><br>${escapeHtml(hospital.docs)}</p></div>`;

function render() {
  const filtered = state.hospitals.filter(hospital => {
    const matchesFilter = state.filter === 'all' || (state.filter === 'yes' ? isSupported(hospital) : !isSupported(hospital));
    const haystack = `${hospital.name} ${hospital.region} ${hospital.type}`.toLowerCase();
    return matchesFilter && haystack.includes(state.query.toLowerCase());
  });
  document.querySelector('#results').textContent = `${filtered.length}개 기관이 검색되었습니다.`;
  const list = document.querySelector('#hospital-list');
  list.innerHTML = filtered.length ? filtered.map(h => `<li><button class="hospital" data-id="${state.hospitals.indexOf(h)}"><span class="hospital-name">${escapeHtml(h.name)}<span class="badge ${isSupported(h) ? 'yes' : 'no'}">${isSupported(h) ? '지원 가능' : '지원 불가'}</span></span><span class="hospital-meta">${escapeHtml(h.region)} · ${escapeHtml(h.type)}</span></button></li>`).join('') : '<li class="empty">검색 결과가 없습니다.</li>';
  state.markers.forEach(({ marker, hospital }) => marker.setOpacity(filtered.includes(hospital) ? 1 : 0));
}

fetch('data/hospitals.json').then(response => { if (!response.ok) throw new Error('데이터를 불러오지 못했습니다.'); return response.json(); }).then(hospitals => {
  state.hospitals = hospitals;
  document.querySelector('#total-count').textContent = hospitals.length;
  document.querySelector('#yes-count').textContent = hospitals.filter(isSupported).length;
  hospitals.forEach((hospital, index) => {
    const supported = isSupported(hospital);
    const marker = L.circleMarker(coordsFor(hospital, index), { radius: 7, color: '#fff', weight: 2, fillColor: supported ? '#159968' : '#d95059', fillOpacity: .9 }).addTo(map).bindPopup(popup(hospital));
    state.markers.push({ marker, hospital });
  });
  render();
}).catch(error => { document.querySelector('#results').textContent = error.message; });

document.querySelector('#search').addEventListener('input', event => { state.query = event.target.value; render(); });
document.querySelectorAll('.filter').forEach(button => button.addEventListener('click', () => { document.querySelectorAll('.filter').forEach(item => item.classList.remove('active')); button.classList.add('active'); state.filter = button.dataset.filter; render(); }));
document.querySelector('#hospital-list').addEventListener('click', event => { const button = event.target.closest('[data-id]'); if (!button) return; const item = state.markers[Number(button.dataset.id)]; if (item) { item.marker.openPopup(); map.panTo(item.marker.getLatLng()); } });
