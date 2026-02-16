const fs = require('fs');
const path = require('path');

const DOCS = path.join(__dirname, '..', 'docs');
const DOMAIN = 'https://ikjoobang.github.io/xivix-tower-control';

// ─── DATA ───
const businesses = [
  {
    id: 'raon-beauty',
    name: '라온뷰티',
    nameEn: 'Raon Beauty',
    type: 'BeautySalon',
    category: '피부/미용',
    description: '병점 피부관리 전문점. 여드름, 모공각화증, 눈썹 관리, 피부 트러블 케어. 안녕동 위치.',
    address: '경기 화성시 병점구 용주로 91층',
    phone: '031-235-5726',
    url: 'https://naver.me/Fwj3TxKy',
    lat: 37.1847,
    lng: 126.9927,
    hours: '',
    sns: {
      instagram: '',
      youtube: '',
      blog: '',
      kakao: '',
      other: ''
    },
    keywords: [
      '라온뷰티','안녕동피부','병점피부관리','병점모공각화증',
      '병점여드름','동탄여드름','병점여드름관리','화성피부',
      '안녕동피부관리','안녕동눈썹'
    ],
    faq: [
      { q: '병점 피부관리 어디가 좋나요?', a: '라온뷰티는 병점 안녕동에 위치한 피부관리 전문점으로, 여드름/모공각화증/눈썹 관리를 전문으로 합니다.' },
      { q: '모공각화증 관리 가능한가요?', a: '네, 모공각화증 전문 관리 프로그램을 운영하고 있습니다. 상담 후 맞춤 케어를 제공합니다.' },
      { q: '예약은 어떻게 하나요?', a: '전화(031-235-5726) 또는 네이버 예약으로 가능합니다.' },
      { q: '동탄에서도 가까운가요?', a: '병점역 인근 안녕동에 위치하여 동탄에서도 10분 거리입니다.' }
    ],
    maps: ['google','naver','kakao']
  },
  {
    id: 'gangnam-dental',
    name: '강남스마일치과',
    nameEn: 'Gangnam Smile Dental',
    type: 'Dentist',
    category: '치과',
    description: '강남역 3번출구, 임플란트/교정 전문 치과. 20년 경력 원장 직접 진료.',
    address: '서울 강남구 강남대로 396',
    phone: '02-555-1234',
    url: 'https://gangnam-smile.co.kr',
    lat: 37.4979,
    lng: 127.0276,
    hours: '월~금 09:00-21:00, 토 09:00-15:00',
    sns: { instagram: 'https://instagram.com/gangnam_smile', blog: 'https://blog.naver.com/gangnam_smile' },
    keywords: ['강남 치과','강남역 치과','임플란트','교정','강남 임플란트'],
    faq: [
      { q: '임플란트 비용이 얼마인가요?', a: '80만~180만원이며, 정확한 비용은 CT 촬영 후 상담 시 안내드립니다.' },
      { q: '교정 기간은 얼마나 걸리나요?', a: '일반 교정 1~2년, 부분 교정 6개월~1년 정도 소요됩니다.' }
    ],
    maps: ['google','naver','kakao']
  }
];

// ─── HELPERS ───
function ensureDir(d) { fs.mkdirSync(d, { recursive: true }); }
function writeF(p, c) { fs.writeFileSync(p, c, 'utf8'); console.log('  [OK] ' + p.replace(DOCS+'/', '')); }

// ─── SCHEMA.ORG JSON-LD ───
function buildSchema(b) {
  const sameAs = [];
  if (b.sns) {
    Object.values(b.sns).forEach(v => { if (v) sameAs.push(v); });
  }
  if (b.url) sameAs.push(b.url);

  const schema = {
    '@context': 'https://schema.org',
    '@type': b.type || 'LocalBusiness',
    name: b.name,
    description: b.description,
    address: {
      '@type': 'PostalAddress',
      streetAddress: b.address,
      addressCountry: 'KR'
    },
    telephone: b.phone,
    url: b.url || `${DOMAIN}/brands/${b.id}/`,
    geo: {
      '@type': 'GeoCoordinates',
      latitude: b.lat,
      longitude: b.lng
    },
    sameAs: sameAs
  };
  if (b.hours) schema.openingHours = b.hours;
  if (b.faq && b.faq.length) {
    schema.mainEntity = b.faq.map(f => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a }
    }));
  }
  return schema;
}

// ─── FAQ SCHEMA ───
function buildFaqSchema(b) {
  if (!b.faq || !b.faq.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: b.faq.map(f => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a }
    }))
  };
}

// ─── HTML PAGE ───
function buildPage(b) {
  const schema = buildSchema(b);
  const faqSchema = buildFaqSchema(b);
  const snsLinks = [];
  if (b.sns) {
    const labels = { instagram: '인스타그램', youtube: '유튜브', blog: '네이버블로그', kakao: '카카오채널', other: '링크' };
    Object.entries(b.sns).forEach(([k, v]) => {
      if (v) snsLinks.push(`<a href="${v}" target="_blank" rel="noopener" class="sns-btn">${labels[k] || k}</a>`);
    });
  }

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${b.name} - ${b.category} | ${b.address}</title>
<meta name="description" content="${b.description}">
<meta name="keywords" content="${b.keywords.join(', ')}">
<meta property="og:title" content="${b.name} - ${b.category}">
<meta property="og:description" content="${b.description}">
<meta property="og:type" content="business.business">
<meta property="og:url" content="${DOMAIN}/brands/${b.id}/">
<meta property="og:locale" content="ko_KR">
<meta property="business:contact_data:street_address" content="${b.address}">
<meta property="business:contact_data:phone_number" content="${b.phone}">
<meta name="naver-site-verification" content="">
<link rel="canonical" href="${DOMAIN}/brands/${b.id}/">
<script type="application/ld+json">${JSON.stringify(schema)}</script>
${faqSchema ? `<script type="application/ld+json">${JSON.stringify(faqSchema)}</script>` : ''}
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,'Malgun Gothic',sans-serif;background:#fafafa;color:#1f2937;line-height:1.6}
.container{max-width:640px;margin:0 auto;padding:1rem}
.hero{background:#fff;border-radius:12px;padding:1.5rem;box-shadow:0 1px 3px rgba(0,0,0,.1);margin-bottom:1rem}
.hero h1{font-size:1.4rem;margin-bottom:.3rem}
.category{display:inline-block;background:#eff6ff;color:#2563eb;padding:.15rem .5rem;border-radius:4px;font-size:.75rem;font-weight:600;margin-bottom:.5rem}
.desc{color:#4b5563;font-size:.9rem;margin:.5rem 0}
.info-row{display:flex;gap:.5rem;align-items:center;font-size:.85rem;color:#6b7280;margin:.3rem 0}
.info-row a{color:#2563eb;text-decoration:none}
.keywords{display:flex;flex-wrap:wrap;gap:.3rem;margin:1rem 0}
.kw{background:#f3f4f6;color:#374151;padding:.2rem .5rem;border-radius:4px;font-size:.75rem}
.sns-section{margin:1rem 0}
.sns-btn{display:inline-block;padding:.4rem .8rem;background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;font-size:.8rem;color:#1f2937;text-decoration:none;margin:.2rem}
.sns-btn:hover{border-color:#2563eb;color:#2563eb}
.faq{background:#fff;border-radius:12px;padding:1.5rem;box-shadow:0 1px 3px rgba(0,0,0,.1);margin-bottom:1rem}
.faq h2{font-size:1.1rem;margin-bottom:.8rem}
.faq-item{margin-bottom:.8rem;padding-bottom:.8rem;border-bottom:1px solid #f3f4f6}
.faq-item:last-child{border-bottom:none}
.faq-q{font-weight:600;font-size:.9rem;margin-bottom:.2rem}
.faq-a{color:#4b5563;font-size:.85rem}
.maps{background:#fff;border-radius:12px;padding:1.5rem;box-shadow:0 1px 3px rgba(0,0,0,.1);margin-bottom:1rem}
.maps h2{font-size:1.1rem;margin-bottom:.6rem}
.map-links{display:flex;flex-wrap:wrap;gap:.4rem}
.map-link{display:inline-flex;align-items:center;gap:.3rem;padding:.5rem .8rem;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;font-size:.82rem;color:#166534;text-decoration:none}
.map-link:hover{background:#dcfce7}
.footer{text-align:center;padding:1.5rem;font-size:.7rem;color:#9ca3af}
.footer a{color:#6b7280}
</style>
</head>
<body>
<div class="container">
<div class="hero">
<span class="category">${b.category}</span>
<h1>${b.name}</h1>
<p class="desc">${b.description}</p>
<div class="info-row">📍 ${b.address}</div>
<div class="info-row">📞 <a href="tel:${b.phone.replace(/-/g,'')}">${b.phone}</a></div>
${b.hours ? `<div class="info-row">🕐 ${b.hours}</div>` : ''}
${b.url ? `<div class="info-row">🔗 <a href="${b.url}" target="_blank">${b.url}</a></div>` : ''}
${snsLinks.length ? `<div class="sns-section">${snsLinks.join('')}</div>` : ''}
<div class="keywords">${b.keywords.map(k => `<span class="kw">${k}</span>`).join('')}</div>
</div>

${b.faq && b.faq.length ? `
<div class="faq">
<h2>자주 묻는 질문</h2>
${b.faq.map(f => `<div class="faq-item"><div class="faq-q">Q. ${f.q}</div><div class="faq-a">A. ${f.a}</div></div>`).join('')}
</div>` : ''}

<div class="maps">
<h2>지도에서 보기</h2>
<div class="map-links">
<a class="map-link" href="https://www.google.com/maps/search/?api=1&query=${b.lat},${b.lng}" target="_blank">📍 구글맵</a>
<a class="map-link" href="https://map.naver.com/v5/search/${encodeURIComponent(b.name)}" target="_blank">📍 네이버지도</a>
<a class="map-link" href="https://map.kakao.com/?q=${encodeURIComponent(b.name)}" target="_blank">📍 카카오맵</a>
</div>
</div>

<div class="footer">
<p>${b.name} | ${b.address} | ${b.phone}</p>
<p>Managed by <a href="${DOMAIN}">XIVIX Tower Control</a></p>
</div>
</div>
</body>
</html>`;
}

// ─── LLMS.TXT (Individual) ───
function buildLlms(b) {
  const snsLines = [];
  if (b.sns) Object.entries(b.sns).forEach(([k,v]) => { if(v) snsLines.push(`- ${k}: ${v}`); });

  return `# ${b.name}
> ${b.description}

## 기본 정보
- 업종: ${b.category}
- 주소: ${b.address}
- 전화: ${b.phone}
- 웹사이트: ${b.url || '없음'}
${b.hours ? `- 운영시간: ${b.hours}` : ''}
- 좌표: ${b.lat}, ${b.lng}

## 키워드
${b.keywords.map(k => `- ${k}`).join('\n')}

${snsLines.length ? `## SNS 채널\n${snsLines.join('\n')}` : ''}

## 자주 묻는 질문
${(b.faq || []).map(f => `### Q: ${f.q}\nA: ${f.a}`).join('\n\n')}

## 지도 링크
- Google Maps: https://www.google.com/maps/search/?api=1&query=${b.lat},${b.lng}
- Naver Map: https://map.naver.com/v5/search/${encodeURIComponent(b.name)}
- Kakao Map: https://map.kakao.com/?q=${encodeURIComponent(b.name)}
`;
}

// ─── GLOBAL LLMS.TXT ───
function buildGlobalLlms(allBiz) {
  let out = `# XIVIX Tower Control - Brand Directory
> 소상공인/프리랜서 통합 검색 최적화 시스템

## 등록된 매장 (${allBiz.length}개)

`;
  allBiz.forEach(b => {
    out += `### ${b.name}
- 업종: ${b.category}
- 주소: ${b.address}
- 전화: ${b.phone}
- 키워드: ${b.keywords.join(', ')}
- 상세: ${DOMAIN}/brands/${b.id}/
- llms.txt: ${DOMAIN}/brands/${b.id}/llms.txt

`;
  });
  return out;
}

// ─── SITEMAP ───
function buildSitemap(allBiz) {
  const now = new Date().toISOString().split('T')[0];
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url><loc>${DOMAIN}/</loc><lastmod>${now}</lastmod><priority>1.0</priority></url>
<url><loc>${DOMAIN}/dashboard.html</loc><lastmod>${now}</lastmod><priority>0.5</priority></url>
`;
  allBiz.forEach(b => {
    xml += `<url><loc>${DOMAIN}/brands/${b.id}/</loc><lastmod>${now}</lastmod><priority>0.8</priority></url>\n`;
  });
  xml += '</urlset>';
  return xml;
}

// ─── ROBOTS.TXT ───
function buildRobots() {
  return `User-agent: *
Allow: /

User-agent: GPTBot
Allow: /

User-agent: Claude-Web
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

Sitemap: ${DOMAIN}/sitemap.xml
`;
}

// ─── INDEX PAGE ───
function buildIndex(allBiz) {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>XIVIX Brand Directory</title>
<meta name="description" content="XIVIX Tower Control이 관리하는 매장/프리랜서 디렉토리">
<link rel="canonical" href="${DOMAIN}/">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,'Malgun Gothic',sans-serif;background:#fafafa;color:#1f2937;line-height:1.6}
.container{max-width:720px;margin:0 auto;padding:1.5rem}
h1{font-size:1.3rem;margin-bottom:1rem}
.card{background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:1rem;margin-bottom:.6rem;text-decoration:none;color:inherit;display:block;transition:box-shadow .15s}
.card:hover{box-shadow:0 2px 8px rgba(0,0,0,.08)}
.card h2{font-size:1rem;margin-bottom:.2rem}
.card .cat{color:#2563eb;font-size:.75rem;font-weight:600}
.card .addr{color:#6b7280;font-size:.82rem}
.card .kws{margin-top:.3rem;display:flex;flex-wrap:wrap;gap:.2rem}
.card .kw{background:#f3f4f6;padding:.1rem .35rem;border-radius:3px;font-size:.68rem;color:#374151}
.footer{text-align:center;padding:2rem;font-size:.72rem;color:#9ca3af}
</style>
</head>
<body>
<div class="container">
<h1>XIVIX Brand Directory</h1>
<p style="color:#6b7280;font-size:.85rem;margin-bottom:1rem">${allBiz.length}개 매장이 등록되어 있습니다.</p>
${allBiz.map(b => `
<a href="brands/${b.id}/" class="card">
<span class="cat">${b.category}</span>
<h2>${b.name}</h2>
<div class="addr">📍 ${b.address} | 📞 ${b.phone}</div>
<div class="kws">${b.keywords.slice(0,5).map(k => `<span class="kw">${k}</span>`).join('')}</div>
</a>`).join('')}
<div class="footer">
<p>Managed by XIVIX Tower Control</p>
<p><a href="llms.txt" style="color:#6b7280">llms.txt</a> | <a href="sitemap.xml" style="color:#6b7280">sitemap.xml</a></p>
</div>
</div>
</body>
</html>`;
}

// ─── C-RANK CONFIG ───
function buildCrankConfig(allBiz) {
  return JSON.stringify({
    version: '1.0.0',
    updated: new Date().toISOString(),
    businesses: allBiz.map(b => ({
      id: b.id,
      name: b.name,
      category: b.category,
      keywords: b.keywords,
      crankEnabled: true
    }))
  }, null, 2);
}

// ═══════════════════════════════
// BUILD
// ═══════════════════════════════
console.log('=== XIVIX Tower Control Build ===\n');

// Clean old brands
const brandsDir = path.join(DOCS, 'brands');
if (fs.existsSync(brandsDir)) {
  fs.rmSync(brandsDir, { recursive: true });
}

// Build each business
businesses.forEach(b => {
  const dir = path.join(DOCS, 'brands', b.id);
  ensureDir(dir);
  writeF(path.join(dir, 'index.html'), buildPage(b));
  writeF(path.join(dir, 'llms.txt'), buildLlms(b));
});

// Global files
writeF(path.join(DOCS, 'index.html'), buildIndex(businesses));
writeF(path.join(DOCS, 'llms.txt'), buildGlobalLlms(businesses));
writeF(path.join(DOCS, 'sitemap.xml'), buildSitemap(businesses));
writeF(path.join(DOCS, 'robots.txt'), buildRobots());
writeF(path.join(DOCS, 'crank-config.json'), buildCrankConfig(businesses));

console.log('\n=== Build Complete ===');
console.log('Total: ' + businesses.length + ' businesses');
console.log('Files: ' + (businesses.length * 2 + 5) + ' files generated');
