// Leaflet 지도 초기화
const map = L.map('map').setView([37.566, 127.0], 10);

// OpenStreetMap 타일 추가
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// 병원 데이터 로딩 및 표시
fetch('data/hospitals.json')
  .then(res => res.json())
  .then(data => {
    data.forEach(h => {
      L.marker([h.latitude, h.longitude])
        .addTo(map)
        .bindPopup(createPopup(h));
    });
  });

// 팝업 HTML 템플릿 생성
function createPopup(h) {
  const supportYesClass = h.e === '1' ? 'support-yes' : 'support-no';
  const supportText = h.e === '1' ? '진료 지원 가능' : '진료 지원 불가';
  
  return `
    <h3>${h['기관명']}</h3>
    <p><strong>지역:</strong> ${h['시도']}, ${h['시군구/권역']}</p>
    <p class="${supportYesClass}"><strong>${supportText}</strong></p>
    <p><strong>유형:</strong> ${h['기관 유형']}</p>
    <p><strong>지원범위:</strong> ${h['2. 지원범위']}</p>
    <p><strong>진료 금액:</strong> ${h['3. 진료 금액 및 횟수']}</p>
    <p><strong>필요서류:</strong> ${h['4. 필요서류 및 절차']}</p>
  `;
}
