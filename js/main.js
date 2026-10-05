const map = L.map('map', { zoomControl: true }).setView([36.35, 127.8], 7);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

const state = { hospitals: [], markers: [], filter: 'all', query: '' };

const escapeHtml = value => String(value || '-').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
const supportState = hospital => {
  const value = String(hospital.support || '').toLowerCase();
  if (['yes', '1', 'o', 'available'].includes(value)) return 'yes';
  if (['no', '0', 'x', 'unavailable'].includes(value)) return 'no';
  return 'unknown';
};
const isSupported = hospital => supportState(hospital) === 'yes';
const supportLabel = hospital => ({ yes: '지원 가능', no: '지원 불가', unknown: '확인 필요' }[supportState(hospital)]);
const coordsFor = hospital => {
  if (hospital.latitude == null || hospital.longitude == null || hospital.latitude === '' || hospital.longitude === '') return null;
  const latitude = Number(hospital.latitude);
  const longitude = Number(hospital.longitude);
  const placeholder = latitude === 37.566 && longitude === 127;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || placeholder) return null;
  if (latitude < 33 || latitude > 39 || longitude < 124 || longitude > 132) return null;
  return [latitude, longitude];
};
const popup = hospital => `<div class="popup"><h3>${escapeHtml(hospital.name)}</h3><p><strong>지역</strong> ${escapeHtml(hospital.region)}</p><p class="support ${supportState(hospital)}">● ${supportLabel(hospital)}</p><p><strong>유형</strong> ${escapeHtml(hospital.type)}</p><p><strong>지원 범위</strong><br>${escapeHtml(hospital.support_range)}</p><p><strong>진료 금액</strong><br>${escapeHtml(hospital.amount)}</p><p><strong>필요 서류</strong><br>${escapeHtml(hospital.docs)}</p></div>`;

async function loadHospitals() {
  if (!window.HOSPITALS_API_URL) throw new Error('Apps Script 웹 앱 URL을 js/config.js에 설정해야 합니다.');
  const response = await fetch(window.HOSPITALS_API_URL);
  if (!response.ok) throw new Error('Apps Script에서 병원 데이터를 읽지 못했습니다.');
  const payload = await response.json();
  if (payload.ok === false) throw new Error('Apps Script가 병원 데이터를 반환하지 못했습니다.');
  const records = Array.isArray(payload) ? payload : payload.hospitals;
  if (!Array.isArray(records)) throw new Error('Apps Script 응답 형식을 확인하세요.');

  return records.map(record => {
    const status = record.status === 'available' ? 'Yes' : record.status === 'unavailable' ? 'No' : record.status === 'unknown' ? 'Unknown' : record.support;
    return {
      ...record,
      region: record.region || [record.province, record.city].filter(Boolean).join(' / '),
      support: status,
      support_range: record.support_range || record.scope || '',
      amount: record.amount || record.cost || '',
      docs: record.docs || record.procedure || '',
      other: Array.isArray(record.other) ? record.other.join('\n') : Array.isArray(record.notes) ? record.notes.join('\n') : record.other || ''
    };
  });
}

function render() {
  const filtered = state.hospitals.filter(hospital => {
    const matchesFilter = state.filter === 'all' || supportState(hospital) === state.filter;
    const haystack = `${hospital.name} ${hospital.region} ${hospital.type}`.toLowerCase();
    return matchesFilter && haystack.includes(state.query.toLowerCase());
  });
  document.querySelector('#results').textContent = `${filtered.length}개 기관이 검색되었습니다.`;
  const list = document.querySelector('#hospital-list');
  list.innerHTML = filtered.length ? filtered.map(h => {
    const hasCoordinates = Boolean(coordsFor(h));
    return `<li><button class="hospital" data-id="${state.hospitals.indexOf(h)}" ${hasCoordinates ? '' : 'disabled title="좌표 정보가 등록되지 않았습니다."'}><span class="hospital-name">${escapeHtml(h.name)}<span class="badge ${supportState(h)}">${supportLabel(h)}</span></span><span class="hospital-meta">${escapeHtml(h.region)} · ${escapeHtml(h.type)}</span></button></li>`;
  }).join('') : '<li class="empty">검색 결과가 없습니다.</li>';
  state.markers.forEach(({ marker, hospital }) => marker.setOpacity(filtered.includes(hospital) ? 1 : 0));
}

loadHospitals().then(hospitals => {
  state.hospitals = hospitals;
  document.querySelector('#total-count').textContent = hospitals.length;
  document.querySelector('#yes-count').textContent = hospitals.filter(isSupported).length;
  hospitals.forEach(hospital => {
    const coordinates = coordsFor(hospital);
    if (!coordinates) return;
    const markerColor = { yes: '#159968', no: '#d95059', unknown: '#7b8794' }[supportState(hospital)];
    const marker = L.circleMarker(coordinates, { radius: 7, color: '#fff', weight: 2, fillColor: markerColor, fillOpacity: .9 }).addTo(map).bindPopup(popup(hospital));
    state.markers.push({ marker, hospital });
  });
  render();
}).catch(error => { document.querySelector('#results').textContent = error.message; });

document.querySelector('#search').addEventListener('input', event => { state.query = event.target.value; render(); });
document.querySelectorAll('.filter').forEach(button => button.addEventListener('click', () => { document.querySelectorAll('.filter').forEach(item => item.classList.remove('active')); button.classList.add('active'); state.filter = button.dataset.filter; render(); }));
document.querySelector('#hospital-list').addEventListener('click', event => { const button = event.target.closest('[data-id]'); if (!button || button.disabled) return; const hospital = state.hospitals[Number(button.dataset.id)]; const item = state.markers.find(marker => marker.hospital === hospital); if (item) { item.marker.openPopup(); map.panTo(item.marker.getLatLng()); } });
