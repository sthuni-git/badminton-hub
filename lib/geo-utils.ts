export interface Coordinates {
  lat: number;
  lng: number;
}

export interface LocationPreset {
  id: string;
  name: string;
  coords: Coordinates;
}

// 1. 전국 주요 배드민턴 전용구장 및 체육관 정밀 좌표
const VENUE_COORDINATES: Record<string, Coordinates> = {
  // 서울 & 수도권
  '잠실실내체육관': { lat: 37.5160, lng: 127.0732 },
  '마곡실내배드민턴장': { lat: 37.5601, lng: 126.8285 },
  '수원시배드민턴전용경기장': { lat: 37.3005, lng: 127.0092 },
  '남동체육관': { lat: 37.4472, lng: 126.7323 },
  '고양어울림누리체육관': { lat: 37.6534, lng: 126.8378 },
  '이충문화체육센터': { lat: 37.0588, lng: 127.0673 },
  '호계체육관': { lat: 37.3758, lng: 126.9682 },
  '양주국민체육센터': { lat: 37.8289, lng: 127.0456 },
  '다락원': { lat: 37.6890, lng: 127.0430 },
  '한석봉체육관': { lat: 37.8315, lng: 127.5095 },

  // 충청권
  '청주배드민턴체육관': { lat: 36.6358, lng: 127.4589 },
  '한밭대학교 체육관': { lat: 36.3508, lng: 127.2987 },
  '유관순체육관': { lat: 36.8188, lng: 127.1278 },
  '부여국민체육센터': { lat: 36.2758, lng: 126.9123 },

  // 전라권
  '화산체육관': { lat: 35.8152, lng: 127.1235 },
  '진남체육관': { lat: 34.7578, lng: 127.7123 },
  '광주여대 유니버시아드체육관': { lat: 35.1528, lng: 126.8153 },
  '남원종합스포츠타운': { lat: 35.4162, lng: 127.3912 },
  '이순신체육관': { lat: 36.7825, lng: 127.0042 },

  // 경상권
  '강서체육공원': { lat: 35.2078, lng: 128.9772 },
  '박정희체육관': { lat: 36.1082, lng: 128.3615 },
  '마산실내체육관': { lat: 35.2285, lng: 128.5831 },
  '대구실내체육관': { lat: 35.8893, lng: 128.6083 },
  '벡스코': { lat: 35.1690, lng: 129.1360 },
  '밀양배드민턴경기장': { lat: 35.4925, lng: 128.7450 },

  // 강원 & 제주
  '봄내체육관': { lat: 37.8687, lng: 127.7455 },
  '치악체육관': { lat: 37.3422, lng: 127.9458 },
  '한라체육관': { lat: 33.4975, lng: 126.5186 },
};

// 2. 대한민국 시·군·구 단위 정밀 행정구역 좌표 (총 120+개 주요 지자체 전수)
export const DISTRICT_COORDINATES: Array<{ name: string; keyword: string; coords: Coordinates }> = [
  // 서울특별시 25개 자치구
  { name: '서울 광진구', keyword: '광진', coords: { lat: 37.5385, lng: 127.0823 } },
  { name: '서울 송파구', keyword: '송파', coords: { lat: 37.5145, lng: 127.1058 } },
  { name: '서울 강남구', keyword: '강남', coords: { lat: 37.5172, lng: 127.0473 } },
  { name: '서울 강동구', keyword: '강동', coords: { lat: 37.5301, lng: 127.1238 } },
  { name: '서울 서초구', keyword: '서초', coords: { lat: 37.4837, lng: 127.0324 } },
  { name: '서울 성동구', keyword: '성동', coords: { lat: 37.5635, lng: 127.0365 } },
  { name: '서울 중랑구', keyword: '중랑', coords: { lat: 37.6065, lng: 127.0927 } },
  { name: '서울 동대문구', keyword: '동대문', coords: { lat: 37.5744, lng: 127.0396 } },
  { name: '서울 마포구', keyword: '마포', coords: { lat: 37.5663, lng: 126.9016 } },
  { name: '서울 강서구', keyword: '강서구', coords: { lat: 37.5509, lng: 126.8497 } },
  { name: '서울 영등포구', keyword: '영등포', coords: { lat: 37.5264, lng: 126.8962 } },
  { name: '서울 노원구', keyword: '노원', coords: { lat: 37.6542, lng: 127.0568 } },
  { name: '서울 도봉구', keyword: '도봉', coords: { lat: 37.6688, lng: 127.0471 } },
  { name: '서울 강북구', keyword: '강북', coords: { lat: 37.6396, lng: 127.0257 } },
  { name: '서울 성북구', keyword: '성북', coords: { lat: 37.5891, lng: 127.0182 } },
  { name: '서울 종로구', keyword: '종로', coords: { lat: 37.5730, lng: 126.9794 } },
  { name: '서울 중구', keyword: '중구', coords: { lat: 37.5636, lng: 126.9975 } },
  { name: '서울 용산구', keyword: '용산', coords: { lat: 37.5326, lng: 126.9900 } },
  { name: '서울 서대문구', keyword: '서대문', coords: { lat: 37.5791, lng: 126.9368 } },
  { name: '서울 은평구', keyword: '은평', coords: { lat: 37.6027, lng: 126.9291 } },
  { name: '서울 양천구', keyword: '양천', coords: { lat: 37.5169, lng: 126.8660 } },
  { name: '서울 구로구', keyword: '구로', coords: { lat: 37.4954, lng: 126.8874 } },
  { name: '서울 금천구', keyword: '금천', coords: { lat: 37.4568, lng: 126.8954 } },
  { name: '서울 동작구', keyword: '동작', coords: { lat: 37.5124, lng: 126.9393 } },
  { name: '서울 관악구', keyword: '관악', coords: { lat: 37.4784, lng: 126.9516 } },

  // 경기도 시/군
  { name: '경기 수원시', keyword: '수원', coords: { lat: 37.2636, lng: 127.0286 } },
  { name: '경기 성남시', keyword: '성남', coords: { lat: 37.4200, lng: 127.1265 } },
  { name: '경기 고양시', keyword: '고양', coords: { lat: 37.6584, lng: 126.8320 } },
  { name: '경기 용인시', keyword: '용인', coords: { lat: 37.2411, lng: 127.1776 } },
  { name: '경기 부천시', keyword: '부천', coords: { lat: 37.5034, lng: 126.7660 } },
  { name: '경기 안양시', keyword: '안양', coords: { lat: 37.3943, lng: 126.9568 } },
  { name: '경기 안산시', keyword: '안산', coords: { lat: 37.3219, lng: 126.8309 } },
  { name: '경기 화성시', keyword: '화성', coords: { lat: 37.1995, lng: 126.8315 } },
  { name: '경기 평택시', keyword: '평택', coords: { lat: 37.0588, lng: 127.0673 } },
  { name: '경기 의정부시', keyword: '의정부', coords: { lat: 37.7381, lng: 127.0337 } },
  { name: '경기 파주시', keyword: '파주', coords: { lat: 37.7599, lng: 126.7799 } },
  { name: '경기 시흥시', keyword: '시흥', coords: { lat: 37.3802, lng: 126.8029 } },
  { name: '경기 김포시', keyword: '김포', coords: { lat: 37.6152, lng: 126.7157 } },
  { name: '경기 광명시', keyword: '광명', coords: { lat: 37.4786, lng: 126.8647 } },
  { name: '경기 광주시', keyword: '경기 광주', coords: { lat: 37.4294, lng: 127.2551 } },
  { name: '경기 군포시', keyword: '군포', coords: { lat: 37.3614, lng: 126.9352 } },
  { name: '경기 이천시', keyword: '이천', coords: { lat: 37.2723, lng: 127.4350 } },
  { name: '경기 오산시', keyword: '오산', coords: { lat: 37.1498, lng: 127.0772 } },
  { name: '경기 하남시', keyword: '하남', coords: { lat: 37.5392, lng: 127.2148 } },
  { name: '경기 양주시', keyword: '양주', coords: { lat: 37.8289, lng: 127.0456 } },
  { name: '경기 구리시', keyword: '구리', coords: { lat: 37.5943, lng: 127.1295 } },
  { name: '경기 안성시', keyword: '안성', coords: { lat: 37.0080, lng: 127.2797 } },
  { name: '경기 포천시', keyword: '포천', coords: { lat: 37.8949, lng: 127.2003 } },
  { name: '경기 의왕시', keyword: '의왕', coords: { lat: 37.3448, lng: 126.9682 } },
  { name: '경기 여주시', keyword: '여주', coords: { lat: 37.2983, lng: 127.6370 } },
  { name: '경기 양평군', keyword: '양평', coords: { lat: 37.4917, lng: 127.4876 } },
  { name: '경기 동두천시', keyword: '동두천', coords: { lat: 37.9036, lng: 127.0607 } },
  { name: '경기 과천시', keyword: '과천', coords: { lat: 37.4292, lng: 126.9877 } },
  { name: '경기 가평군', keyword: '가평', coords: { lat: 37.8315, lng: 127.5095 } },
  { name: '경기 연천군', keyword: '연천', coords: { lat: 38.0964, lng: 127.0747 } },

  // 인천광역시
  { name: '인천 남동구', keyword: '남동', coords: { lat: 37.4472, lng: 126.7323 } },
  { name: '인천 부평구', keyword: '부평', coords: { lat: 37.5070, lng: 126.7218 } },
  { name: '인천 서구', keyword: '인천 서구', coords: { lat: 37.5454, lng: 126.6760 } },
  { name: '인천 연수구', keyword: '연수', coords: { lat: 37.4098, lng: 126.6783 } },
  { name: '인천 계양구', keyword: '계양', coords: { lat: 37.5374, lng: 126.7378 } },

  // 강원도
  { name: '강원 춘천시', keyword: '춘천', coords: { lat: 37.8813, lng: 127.7298 } },
  { name: '강원 원주시', keyword: '원주', coords: { lat: 37.3422, lng: 127.9202 } },
  { name: '강원 강릉시', keyword: '강릉', coords: { lat: 37.7519, lng: 128.8761 } },
  { name: '강원 동해시', keyword: '동해', coords: { lat: 37.5247, lng: 129.1143 } },
  { name: '강원 속초시', keyword: '속초', coords: { lat: 38.2070, lng: 128.5918 } },
  { name: '강원 홍천군', keyword: '홍천', coords: { lat: 37.6972, lng: 127.8887 } },

  // 충청북도
  { name: '충북 청주시', keyword: '청주', coords: { lat: 36.6424, lng: 127.4890 } },
  { name: '충북 충주시', keyword: '충주', coords: { lat: 36.9910, lng: 127.9259 } },
  { name: '충북 제천시', keyword: '제천', coords: { lat: 37.1326, lng: 128.2141 } },
  { name: '충북 음성군', keyword: '음성', coords: { lat: 36.9338, lng: 127.6905 } },
  { name: '충북 진천군', keyword: '진천', coords: { lat: 36.8553, lng: 127.4432 } },

  // 충청남도 & 대전/세종
  { name: '대전 유성구', keyword: '유성', coords: { lat: 36.3622, lng: 127.3563 } },
  { name: '대전 서구', keyword: '대전 서구', coords: { lat: 36.3553, lng: 127.3837 } },
  { name: '세종특별자치시', keyword: '세종', coords: { lat: 36.4800, lng: 127.2890 } },
  { name: '충남 천안시', keyword: '천안', coords: { lat: 36.8151, lng: 127.1139 } },
  { name: '충남 아산시', keyword: '아산', coords: { lat: 36.7898, lng: 127.0019 } },
  { name: '충남 서산시', keyword: '서산', coords: { lat: 36.7845, lng: 126.4503 } },
  { name: '충남 당진시', keyword: '당진', coords: { lat: 36.8894, lng: 126.6460 } },
  { name: '충남 공주시', keyword: '공주', coords: { lat: 36.4465, lng: 127.1190 } },
  { name: '충남 보령시', keyword: '보령', coords: { lat: 36.3333, lng: 126.6129 } },
  { name: '충남 논산시', keyword: '논산', coords: { lat: 36.1872, lng: 127.0987 } },
  { name: '충남 부여군', keyword: '부여', coords: { lat: 36.2758, lng: 126.9123 } },
  { name: '충남 홍성군', keyword: '홍성', coords: { lat: 36.6013, lng: 126.6608 } },
  { name: '충남 예산군', keyword: '예산', coords: { lat: 36.6806, lng: 126.8454 } },

  // 전북특별자치도
  { name: '전북 전주시', keyword: '전주', coords: { lat: 35.8242, lng: 127.1480 } },
  { name: '전북 익산시', keyword: '익산', coords: { lat: 35.9483, lng: 126.9576 } },
  { name: '전북 군산시', keyword: '군산', coords: { lat: 35.9676, lng: 126.7366 } },
  { name: '전북 남원시', keyword: '남원', coords: { lat: 35.4164, lng: 127.3905 } },
  { name: '전북 정읍시', keyword: '정읍', coords: { lat: 35.5699, lng: 126.8577 } },
  { name: '전북 김제시', keyword: '김제', coords: { lat: 35.8036, lng: 126.8809 } },
  { name: '전북 완주군', keyword: '완주', coords: { lat: 35.9048, lng: 127.1627 } },
  { name: '전북 고창군', keyword: '고창', coords: { lat: 35.4358, lng: 126.7021 } },
  { name: '전북 부안군', keyword: '부안', coords: { lat: 35.7317, lng: 126.7332 } },

  // 전라남도 & 광주광역시
  { name: '광주 광산구', keyword: '광산', coords: { lat: 35.1395, lng: 126.7936 } },
  { name: '광주 서구', keyword: '광주 서구', coords: { lat: 35.1520, lng: 126.8895 } },
  { name: '전남 목포시', keyword: '목포', coords: { lat: 34.8118, lng: 126.3922 } },
  { name: '전남 여수시', keyword: '여수', coords: { lat: 34.7604, lng: 127.6622 } },
  { name: '전남 순천시', keyword: '순천', coords: { lat: 34.9506, lng: 127.4872 } },
  { name: '전남 나주시', keyword: '나주', coords: { lat: 35.0161, lng: 126.7108 } },
  { name: '전남 광양시', keyword: '광양', coords: { lat: 34.9407, lng: 127.6959 } },
  { name: '전남 화순군', keyword: '화순', coords: { lat: 35.0645, lng: 126.9866 } },
  { name: '전남 해남군', keyword: '해남', coords: { lat: 34.5735, lng: 126.5990 } },
  { name: '전남 무안군', keyword: '무안', coords: { lat: 34.9904, lng: 126.4817 } },
  { name: '전남 영광군', keyword: '영광', coords: { lat: 35.2773, lng: 126.5120 } },
  { name: '전남 담양군', keyword: '담양', coords: { lat: 35.3211, lng: 126.9882 } },

  // 경상북도 & 대구광역시
  { name: '대구 북구', keyword: '대구 북구', coords: { lat: 35.8856, lng: 128.5828 } },
  { name: '대구 수성구', keyword: '수성', coords: { lat: 35.8580, lng: 128.6306 } },
  { name: '대구 달서구', keyword: '달서', coords: { lat: 35.8298, lng: 128.5326 } },
  { name: '경북 포항시', keyword: '포항', coords: { lat: 36.0190, lng: 129.3435 } },
  { name: '경북 구미시', keyword: '구미', coords: { lat: 36.1195, lng: 128.3446 } },
  { name: '경북 경주시', keyword: '경주', coords: { lat: 35.8562, lng: 129.2247 } },
  { name: '경북 김천시', keyword: '김천', coords: { lat: 36.1399, lng: 128.1136 } },
  { name: '경북 안동시', keyword: '안동', coords: { lat: 36.5684, lng: 128.7294 } },
  { name: '경북 경산시', keyword: '경산', coords: { lat: 35.8251, lng: 128.7414 } },
  { name: '경북 칠곡군', keyword: '칠곡', coords: { lat: 35.9956, lng: 128.4018 } },
  { name: '경북 상주시', keyword: '상주', coords: { lat: 36.4109, lng: 128.1591 } },
  { name: '경북 영천시', keyword: '영천', coords: { lat: 35.9733, lng: 128.9385 } },

  // 경상남도 & 부산/울산광역시
  { name: '부산 해운대구', keyword: '해운대', coords: { lat: 35.1631, lng: 129.1636 } },
  { name: '부산 부산진구', keyword: '부산진', coords: { lat: 35.1631, lng: 129.0532 } },
  { name: '부산 강서구', keyword: '부산 강서', coords: { lat: 35.2122, lng: 128.9806 } },
  { name: '부산 동래구', keyword: '동래', coords: { lat: 35.2048, lng: 129.0836 } },
  { name: '부산 금정구', keyword: '금정', coords: { lat: 35.2430, lng: 129.0921 } },
  { name: '울산 남구', keyword: '울산', coords: { lat: 35.5438, lng: 129.3300 } },
  { name: '경남 창원시', keyword: '창원', coords: { lat: 35.2280, lng: 128.6811 } },
  { name: '경남 김해시', keyword: '김해', coords: { lat: 35.2285, lng: 128.8894 } },
  { name: '경남 진주시', keyword: '진주', coords: { lat: 35.1802, lng: 128.1076 } },
  { name: '경남 양산시', keyword: '양산', coords: { lat: 35.3350, lng: 129.0373 } },
  { name: '경남 거제시', keyword: '거제', coords: { lat: 34.8806, lng: 128.6211 } },
  { name: '경남 통영시', keyword: '통영', coords: { lat: 34.8544, lng: 128.4332 } },
  { name: '경남 사천시', keyword: '사천', coords: { lat: 35.0038, lng: 128.0642 } },
  { name: '경남 밀양시', keyword: '밀양', coords: { lat: 35.5038, lng: 128.7466 } },
  { name: '경남 거창군', keyword: '거창', coords: { lat: 35.6867, lng: 127.9095 } },
  { name: '경남 창녕군', keyword: '창녕', coords: { lat: 35.5446, lng: 128.4922 } },
  { name: '경남 고성군', keyword: '경남 고성', coords: { lat: 34.9754, lng: 128.3235 } },

  // 제주특별자치도
  { name: '제주 제주시', keyword: '제주', coords: { lat: 33.4996, lng: 126.5312 } },
  { name: '제주 서귀포시', keyword: '서귀포', coords: { lat: 33.2541, lng: 126.5601 } },
];

// 사용자가 쉽게 선택할 수 있는 프리셋 목록
export const PRESET_LOCATIONS: LocationPreset[] = [
  { id: 'gwangjin', name: '서울 광진구 (자양/구의)', coords: { lat: 37.5385, lng: 127.0823 } },
  { id: 'songpa', name: '서울 송파구 (잠실)', coords: { lat: 37.5145, lng: 127.1058 } },
  { id: 'gangnam', name: '서울 강남구 (삼성/역삼)', coords: { lat: 37.5172, lng: 127.0473 } },
  { id: 'gangdong', name: '서울 강동구 (천호/길동)', coords: { lat: 37.5301, lng: 127.1238 } },
  { id: 'seongdong', name: '서울 성동구 (왕십리/성수)', coords: { lat: 37.5635, lng: 127.0365 } },
  { id: 'jungnang', name: '서울 중랑구 (상봉/면목)', coords: { lat: 37.6065, lng: 127.0927 } },
  { id: 'mapo', name: '서울 마포구 (상암/홍대)', coords: { lat: 37.5663, lng: 126.9016 } },
  { id: 'gangseo', name: '서울 강서구 (마곡/화곡)', coords: { lat: 37.5509, lng: 126.8497 } },
  { id: 'nowon', name: '서울 노원구 (상계/중계)', coords: { lat: 37.6542, lng: 127.0568 } },
  { id: 'guri', name: '경기 구리시', coords: { lat: 37.5943, lng: 127.1295 } },
  { id: 'hanam', name: '경기 하남시 (미사/위례)', coords: { lat: 37.5392, lng: 127.2148 } },
  { id: 'seongnam', name: '경기 성남시 (분당/판교)', coords: { lat: 37.4200, lng: 127.1265 } },
  { id: 'suwon', name: '경기 수원시 (권선/영통)', coords: { lat: 37.2636, lng: 127.0286 } },
  { id: 'goyang', name: '경기 고양시 (일산/덕양)', coords: { lat: 37.6584, lng: 126.8320 } },
  { id: 'incheon', name: '인천 (남동/부평)', coords: { lat: 37.4472, lng: 126.7323 } },
  { id: 'daejeon', name: '대전 (유성/서구)', coords: { lat: 36.3504, lng: 127.3845 } },
  { id: 'cheongju', name: '충북 청주시', coords: { lat: 36.6424, lng: 127.4890 } },
  { id: 'daegu', name: '대구 (북구/동성로)', coords: { lat: 35.8714, lng: 128.6014 } },
  { id: 'busan', name: '부산 (해운대/서면)', coords: { lat: 35.1796, lng: 129.0756 } },
  { id: 'gwangju', name: '광주 (광산/상무)', coords: { lat: 35.1595, lng: 126.8526 } },
  { id: 'jeonju', name: '전북 전주시', coords: { lat: 35.8242, lng: 127.1480 } },
  { id: 'chuncheon', name: '강원 춘천시', coords: { lat: 37.8813, lng: 127.7298 } },
  { id: 'jeju', name: '제주 제주시', coords: { lat: 33.4996, lng: 126.5312 } },
];

/**
 * Haversine 공식을 사용해 두 위경도 좌표 간의 직선 거리(km)를 정확하게 계산합니다.
 */
export function calculateDistanceKm(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371; // 지구 반지름 (km)
  const dLat = ((coord2.lat - coord1.lat) * Math.PI) / 180;
  const dLon = ((coord2.lng - coord1.lng) * Math.PI) / 180;

  const lat1 = (coord1.lat * Math.PI) / 180;
  const lat2 = (coord2.lat * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;

  return Math.round(d * 10) / 10;
}

/**
 * 경기장 주소나 이름으로부터 2단계 계층형 정밀 매칭을 통해 위경도 좌표를 도출합니다.
 */
export function getVenueCoordinates(venue: string): Coordinates {
  const normalized = venue.replace(/-/g, ' ');

  // 1단계 (최우선): 특정 유명 경기장 이름 일치
  for (const [key, coords] of Object.entries(VENUE_COORDINATES)) {
    if (normalized.includes(key)) {
      return coords;
    }
  }

  // 2단계: 세부 시·군·구 키워드 (예: '송파', '강남', '원주', '부여', '밀양' 등) 정밀 매칭
  for (const district of DISTRICT_COORDINATES) {
    if (normalized.includes(district.keyword)) {
      return district.coords;
    }
  }

  // 3단계: 도/광역시 단위 광역 중심점 폴백
  if (normalized.includes('서울')) return { lat: 37.5665, lng: 126.9780 };
  if (normalized.includes('경기')) return { lat: 37.2636, lng: 127.0286 };
  if (normalized.includes('인천')) return { lat: 37.4563, lng: 126.7052 };
  if (normalized.includes('강원')) return { lat: 37.8813, lng: 127.7298 };
  if (normalized.includes('충북')) return { lat: 36.6424, lng: 127.4890 };
  if (normalized.includes('충남') || normalized.includes('대전') || normalized.includes('세종')) return { lat: 36.3504, lng: 127.3845 };
  if (normalized.includes('전북')) return { lat: 35.8242, lng: 127.1480 };
  if (normalized.includes('전남') || normalized.includes('광주')) return { lat: 35.1595, lng: 126.8526 };
  if (normalized.includes('경북') || normalized.includes('대구')) return { lat: 35.8714, lng: 128.6014 };
  if (normalized.includes('경남') || normalized.includes('부산') || normalized.includes('울산')) return { lat: 35.1796, lng: 129.0756 };
  if (normalized.includes('제주')) return { lat: 33.4996, lng: 126.5312 };

  // 기본값 (서울 중심)
  return { lat: 37.5385, lng: 127.0823 };
}

/**
 * 위경도 좌표를 기반으로 가장 가까운 행정구역명(예: '서울 광진구', '서울 송파구')을 자동 판별합니다.
 */
export async function reverseGeocodeCoords(coords: Coordinates): Promise<string> {
  // 1. 온라인 OpenStreetMap Nominatim 역지오코딩 시도 (2초 타임아웃)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${coords.lat}&lon=${coords.lng}&format=json&accept-language=ko`,
      {
        signal: controller.signal,
        headers: { 'User-Agent': 'MintonFinder/1.0' },
      }
    );
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = (await res.json()) as { address?: Record<string, string> };
      const addr = data.address;
      if (addr) {
        const city = addr.city || addr.province || addr.state || '';
        const district = addr.borough || addr.suburb || addr.district || addr.county || addr.city_district || '';
        if (district) {
          const shortCity = city.includes('서울') ? '서울' : city.includes('경기') ? '경기' : city.includes('인천') ? '인천' : city.slice(0, 2);
          return `${shortCity} ${district}`;
        }
      }
    }
  } catch {
    // 온라인 API 실패 시 내장 오프라인 매핑으로 폴백
  }

  // 2. 내장된 120+개 시·군·구 좌표와의 최근접 거리(Nearest Neighbor) 계산으로 100% 판별
  let closestDistrict = DISTRICT_COORDINATES[0].name;
  let minDistance = Infinity;

  for (const district of DISTRICT_COORDINATES) {
    const dist = calculateDistanceKm(coords, district.coords);
    if (dist < minDistance) {
      minDistance = dist;
      closestDistrict = district.name;
    }
  }

  return closestDistrict;
}
