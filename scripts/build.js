const fs = require('fs');
const path = require('path');

const DOCS = path.join(__dirname, '..', 'docs');
const DOMAIN = 'https://ikjoobang.github.io/xivix-tower-control';

// ─── DATA: Read from data.json (exported from dashboard) ───
const dataPath = path.join(__dirname, 'data.json');
if (!fs.existsSync(dataPath)) {
  console.error('❌ data.json 없음!');
  console.error('   대시보드 → "빌드 데이터 내보내기" 버튼 클릭 → data.json 저장');
  console.error('   저장 위치: scripts/data.json');
  process.exit(1);
}

const rawData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const businesses = rawData.businesses || [];
const freelancers = rawData.freelancers || [];

if (businesses.length === 0 && freelancers.length === 0) {
  console.error('❌ 등록된 매장/프리랜서가 없습니다.');
  process.exit(1);
}

console.log(`📦 데이터 로드: 매장 ${businesses.length}개, 프리랜서 ${freelancers.length}개\n`);

// ─── HELPERS ───
function ensureDir(d) { fs.mkdirSync(d, { recursive: true }); }
function writeF(p, c) { fs.writeFileSync(p, c, 'utf8'); console.log('  [OK] ' + p.replace(DOCS+'/', '')); }
function esc(s) { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

// ─── Auto-generate FAQ if missing ───
function autoFaq(b) {
  if (b.faq && b.faq.length) return b.faq;
  const area = b.address ? b.address.split(' ').slice(0,3).join(' ') : '';
  const faqs = [];
  faqs.push({ 
    q: `${b.name} 위치가 어디인가요?`, 
    a: `${b.name}은(는) ${b.address}에 위치하고 있습니다.${b.phone ? ' 전화: ' + b.phone : ''}` 
  });
  if (b.phone) {
    faqs.push({ 
      q: `${b.name} 예약/문의는 어떻게 하나요?`, 
      a: `전화(${b.phone})${b.url ? ' 또는 온라인(' + b.url + ')' : ''}으로 문의 가능합니다.` 
    });
  }
  if (b.keywords && b.keywords.length > 2) {
    faqs.push({ 
      q: `${area} ${b.category || '근처'} 추천해주세요`, 
      a: `${b.name}은(는) ${b.keywords.slice(0,3).join(', ')} 등의 서비스를 제공합니다. ${b.address} 위치.` 
    });
  }
  return faqs;
}

// ─── Auto-generate description if missing ───
function autoDesc(b) {
  if (b.description) return b.description;
  const kw = (b.keywords || []).slice(0,4).join(', ');
  const area = b.address ? b.address.split(' ').slice(0,2).join(' ') : '';
  return `${area} ${b.category || ''} ${b.name}. ${kw ? kw + ' 전문.' : ''} ${b.address} 위치.`.trim();
}

// ─── SCHEMA.ORG JSON-LD ───
function buildSchema(b) {
  const sameAs = [];
  if (b.sns) Object.values(b.sns).forEach(v => { if (v) sameAs.push(v); });
  if (b.url) sameAs.push(b.url);

  const schema = {
    '@context': 'https://schema.org',
    '@type': b.type || 'LocalBusiness',
    name: b.name,
    description: autoDesc(b),
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
  
  const faq = autoFaq(b);
  if (faq.length) {
    schema.mainEntity = faq.map(f => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a }
    }));
  }
  return schema;
}

function buildFaqSchema(b) {
  const faq = autoFaq(b);
  if (!faq.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map(f => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a }
    }))
  };
}

// ─── PERSON SCHEMA (for freelancers) ───
function buildPersonSchema(f) {
  const sameAs = [];
  if (f.sns) Object.values(f.sns).forEach(v => { if (v) sameAs.push(v); });
  
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: f.name,
    jobTitle: f.title || f.category || '프리랜서',
    description: autoDesc(f),
    address: {
      '@type': 'PostalAddress',
      addressRegion: f.region || '',
      addressCountry: 'KR'
    },
    telephone: f.phone || '',
    url: `${DOMAIN}/freelancers/${f.id}/`,
    sameAs: sameAs,
    knowsAbout: f.keywords || []
  };
}

// ─── HTML PAGE (Business) ───
function buildPage(b) {
  const desc = autoDesc(b);
  const faq = autoFaq(b);
  const schema = buildSchema(b);
  const faqSchema = buildFaqSchema(b);
  const snsLinks = [];
  if (b.sns) {
    const labels = { instagram: '인스타그램', youtube: '유튜브', blog: '네이버블로그', kakao: '카카오채널', other: '링크' };
    Object.entries(b.sns).forEach(([k, v]) => {
      if (v) snsLinks.push(`<a href="${esc(v)}" target="_blank" rel="noopener" class="sns-btn">${labels[k] || k}</a>`);
    });
  }

  const gmapQ = encodeURIComponent(b.name + ' ' + b.address);
  const naverQ = encodeURIComponent(b.name);
  const kakaoQ = encodeURIComponent(b.name);

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(b.name)} - ${esc(b.category || '')} | ${esc(b.address)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="keywords" content="${esc((b.keywords||[]).join(', '))}">
<meta property="og:title" content="${esc(b.name)} - ${esc(b.category || '')}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="business.business">
<meta property="og:url" content="${DOMAIN}/brands/${b.id}/">
<meta property="og:locale" content="ko_KR">
<meta property="business:contact_data:street_address" content="${esc(b.address)}">
<meta property="business:contact_data:phone_number" content="${esc(b.phone)}">
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
<span class="category">${esc(b.category || '')}</span>
<h1>${esc(b.name)}</h1>
<p class="desc">${esc(desc)}</p>
<div class="info-row">📍 ${esc(b.address)}</div>
<div class="info-row">📞 <a href="tel:${(b.phone||'').replace(/-/g,'')}">${esc(b.phone)}</a></div>
${b.hours ? `<div class="info-row">🕐 ${esc(b.hours)}</div>` : ''}
${b.url ? `<div class="info-row">🔗 <a href="${esc(b.url)}" target="_blank">${esc(b.url)}</a></div>` : ''}
${snsLinks.length ? `<div class="sns-section">${snsLinks.join('')}</div>` : ''}
<div class="keywords">${(b.keywords||[]).map(k => `<span class="kw">${esc(k)}</span>`).join('')}</div>
</div>

${faq.length ? `
<div class="faq">
<h2>자주 묻는 질문</h2>
${faq.map(f => `<div class="faq-item"><div class="faq-q">Q. ${esc(f.q)}</div><div class="faq-a">A. ${esc(f.a)}</div></div>`).join('')}
</div>` : ''}

<div class="maps">
<h2>지도에서 보기</h2>
<div class="map-links">
<a class="map-link" href="https://www.google.com/maps/search/?api=1&query=${gmapQ}" target="_blank">📍 구글맵</a>
<a class="map-link" href="https://map.naver.com/v5/search/${naverQ}" target="_blank">📍 네이버지도</a>
<a class="map-link" href="https://map.kakao.com/?q=${kakaoQ}" target="_blank">📍 카카오맵</a>
</div>
</div>

<div class="footer">
<p>${esc(b.name)} | ${esc(b.address)} | ${esc(b.phone)}</p>
<p>Managed by <a href="${DOMAIN}">XIVIX Tower Control</a></p>
</div>
</div>
</body>
</html>`;
}

// ─── HTML PAGE (Freelancer) ───
function buildFreelancerPage(f) {
  const desc = autoDesc(f);
  const schema = buildPersonSchema(f);
  const snsLinks = [];
  if (f.sns) {
    const labels = { instagram: '인스타그램', youtube: '유튜브', blog: '네이버블로그', kakao: '카카오채널', other: '링크' };
    Object.entries(f.sns).forEach(([k, v]) => {
      if (v) snsLinks.push(`<a href="${esc(v)}" target="_blank" rel="noopener" class="sns-btn">${labels[k] || k}</a>`);
    });
  }

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(f.name)} - ${esc(f.title || f.category || '프리랜서')}</title>
<meta name="description" content="${esc(desc)}">
<meta name="keywords" content="${esc((f.keywords||[]).join(', '))}">
<meta property="og:title" content="${esc(f.name)} - ${esc(f.title || f.category || '프리랜서')}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="profile">
<meta property="og:url" content="${DOMAIN}/freelancers/${f.id}/">
<meta property="og:locale" content="ko_KR">
<link rel="canonical" href="${DOMAIN}/freelancers/${f.id}/">
<script type="application/ld+json">${JSON.stringify(schema)}</script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,'Malgun Gothic',sans-serif;background:#fafafa;color:#1f2937;line-height:1.6}
.container{max-width:640px;margin:0 auto;padding:1rem}
.profile{background:#fff;border-radius:12px;padding:1.5rem;box-shadow:0 1px 3px rgba(0,0,0,.1);margin-bottom:1rem;text-align:center}
.profile h1{font-size:1.4rem;margin-bottom:.2rem}
.title{color:#2563eb;font-size:.85rem;font-weight:600;margin-bottom:.5rem}
.desc{color:#4b5563;font-size:.9rem;margin:.5rem 0;text-align:left}
.info-row{display:flex;gap:.5rem;align-items:center;font-size:.85rem;color:#6b7280;margin:.3rem 0;justify-content:center}
.info-row a{color:#2563eb;text-decoration:none}
.keywords{display:flex;flex-wrap:wrap;gap:.3rem;margin:1rem 0;justify-content:center}
.kw{background:#f3f4f6;color:#374151;padding:.2rem .5rem;border-radius:4px;font-size:.75rem}
.sns-section{margin:1rem 0;text-align:center}
.sns-btn{display:inline-block;padding:.4rem .8rem;background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;font-size:.8rem;color:#1f2937;text-decoration:none;margin:.2rem}
.sns-btn:hover{border-color:#2563eb;color:#2563eb}
.footer{text-align:center;padding:1.5rem;font-size:.7rem;color:#9ca3af}
.footer a{color:#6b7280}
</style>
</head>
<body>
<div class="container">
<div class="profile">
<h1>${esc(f.name)}</h1>
<div class="title">${esc(f.title || f.category || '프리랜서')}</div>
<p class="desc">${esc(desc)}</p>
${f.region ? `<div class="info-row">📍 ${esc(f.region)}</div>` : ''}
${f.phone ? `<div class="info-row">📞 <a href="tel:${(f.phone||'').replace(/-/g,'')}">${esc(f.phone)}</a></div>` : ''}
${f.email ? `<div class="info-row">✉️ <a href="mailto:${esc(f.email)}">${esc(f.email)}</a></div>` : ''}
${snsLinks.length ? `<div class="sns-section">${snsLinks.join('')}</div>` : ''}
<div class="keywords">${(f.keywords||[]).map(k => `<span class="kw">${esc(k)}</span>`).join('')}</div>
</div>
<div class="footer">
<p>${esc(f.name)} | ${esc(f.title || '')}</p>
<p>Managed by <a href="${DOMAIN}">XIVIX Tower Control</a></p>
</div>
</div>
</body>
</html>`;
}

// ─── LLMS.TXT (Individual Business) ───
function buildLlms(b) {
  const desc = autoDesc(b);
  const faq = autoFaq(b);
  const snsLines = [];
  if (b.sns) Object.entries(b.sns).forEach(([k,v]) => { if(v) snsLines.push(`- ${k}: ${v}`); });
  const gmapQ = encodeURIComponent(b.name + ' ' + b.address);

  return `# ${b.name}
> ${desc}

## 기본 정보
- 업종: ${b.category || ''}
- 주소: ${b.address}
- 전화: ${b.phone}
- 웹사이트: ${b.url || '없음'}
${b.hours ? `- 운영시간: ${b.hours}` : ''}
- 좌표: ${b.lat}, ${b.lng}

## 키워드
${(b.keywords||[]).map(k => `- ${k}`).join('\n')}

${snsLines.length ? `## SNS 채널\n${snsLines.join('\n')}` : ''}

## 자주 묻는 질문
${faq.map(f => `### Q: ${f.q}\nA: ${f.a}`).join('\n\n')}

## 지도 링크
- Google Maps: https://www.google.com/maps/search/?api=1&query=${gmapQ}
- Naver Map: https://map.naver.com/v5/search/${encodeURIComponent(b.name)}
- Kakao Map: https://map.kakao.com/?q=${encodeURIComponent(b.name)}
`;
}

// ─── LLMS.TXT (Freelancer) ───
function buildFreelancerLlms(f) {
  const desc = autoDesc(f);
  const snsLines = [];
  if (f.sns) Object.entries(f.sns).forEach(([k,v]) => { if(v) snsLines.push(`- ${k}: ${v}`); });

  return `# ${f.name}
> ${desc}

## 기본 정보
- 직함: ${f.title || f.category || '프리랜서'}
- 활동지역: ${f.region || ''}
- 전화: ${f.phone || ''}
- 이메일: ${f.email || ''}

## 전문 분야 / 키워드
${(f.keywords||[]).map(k => `- ${k}`).join('\n')}

${snsLines.length ? `## SNS 채널\n${snsLines.join('\n')}` : ''}
`;
}

// ─── GLOBAL LLMS.TXT ───
function buildGlobalLlms(allBiz, allFree) {
  let out = `# XIVIX Tower Control - Brand & Freelancer Directory
> 소상공인/프리랜서 통합 검색 최적화 시스템

## 등록된 매장 (${allBiz.length}개)

`;
  allBiz.forEach(b => {
    out += `### ${b.name}
- 업종: ${b.category || ''}
- 주소: ${b.address}
- 전화: ${b.phone}
- 키워드: ${(b.keywords||[]).join(', ')}
- 상세: ${DOMAIN}/brands/${b.id}/
- llms.txt: ${DOMAIN}/brands/${b.id}/llms.txt

`;
  });

  if (allFree.length) {
    out += `## 등록된 프리랜서 (${allFree.length}명)\n\n`;
    allFree.forEach(f => {
      out += `### ${f.name}
- 분야: ${f.title || f.category || ''}
- 지역: ${f.region || ''}
- 키워드: ${(f.keywords||[]).join(', ')}
- 상세: ${DOMAIN}/freelancers/${f.id}/
- llms.txt: ${DOMAIN}/freelancers/${f.id}/llms.txt

`;
    });
  }
  return out;
}

// ─── SITEMAP ───
function buildSitemap(allBiz, allFree) {
  const now = new Date().toISOString().split('T')[0];
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url><loc>${DOMAIN}/</loc><lastmod>${now}</lastmod><priority>1.0</priority></url>
`;
  allBiz.forEach(b => {
    xml += `<url><loc>${DOMAIN}/brands/${b.id}/</loc><lastmod>${now}</lastmod><priority>0.8</priority></url>\n`;
  });
  allFree.forEach(f => {
    xml += `<url><loc>${DOMAIN}/freelancers/${f.id}/</loc><lastmod>${now}</lastmod><priority>0.7</priority></url>\n`;
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

User-agent: Googlebot
Allow: /

User-agent: Yeti
Allow: /

Sitemap: ${DOMAIN}/sitemap.xml
`;
}

// ─── INDEX PAGE ───
function buildIndex(allBiz, allFree) {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>XIVIX Brand Directory</title>
<meta name="description" content="XIVIX Tower Control 매장/프리랜서 통합 디렉토리. SEO, AEO, GEO 최적화.">
<link rel="canonical" href="${DOMAIN}/">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,'Malgun Gothic',sans-serif;background:#fafafa;color:#1f2937;line-height:1.6}
.container{max-width:720px;margin:0 auto;padding:1.5rem}
h1{font-size:1.3rem;margin-bottom:.3rem}
h2{font-size:1.1rem;margin:1.5rem 0 .6rem;color:#374151}
.subtitle{color:#6b7280;font-size:.85rem;margin-bottom:1rem}
.card{background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:1rem;margin-bottom:.6rem;text-decoration:none;color:inherit;display:block;transition:box-shadow .15s}
.card:hover{box-shadow:0 2px 8px rgba(0,0,0,.08)}
.card h3{font-size:1rem;margin-bottom:.2rem}
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
<p class="subtitle">${allBiz.length}개 매장, ${allFree.length}명 프리랜서 등록</p>

${allBiz.length ? `<h2>🏪 매장</h2>
${allBiz.map(b => `
<a href="brands/${b.id}/" class="card">
<span class="cat">${esc(b.category || '')}</span>
<h3>${esc(b.name)}</h3>
<div class="addr">📍 ${esc(b.address)} | 📞 ${esc(b.phone)}</div>
<div class="kws">${(b.keywords||[]).slice(0,5).map(k => `<span class="kw">${esc(k)}</span>`).join('')}</div>
</a>`).join('')}` : ''}

${allFree.length ? `<h2>👤 프리랜서</h2>
${allFree.map(f => `
<a href="freelancers/${f.id}/" class="card">
<span class="cat">${esc(f.title || f.category || '프리랜서')}</span>
<h3>${esc(f.name)}</h3>
<div class="addr">${f.region ? '📍 ' + esc(f.region) : ''}${f.phone ? ' | 📞 ' + esc(f.phone) : ''}</div>
<div class="kws">${(f.keywords||[]).slice(0,5).map(k => `<span class="kw">${esc(k)}</span>`).join('')}</div>
</a>`).join('')}` : ''}

<div class="footer">
<p>Managed by XIVIX Tower Control</p>
<p><a href="llms.txt" style="color:#6b7280">llms.txt</a> | <a href="sitemap.xml" style="color:#6b7280">sitemap.xml</a></p>
</div>
</div>
</body>
</html>`;
}

// ─── C-RANK CONFIG ───
function buildCrankConfig(allBiz, allFree) {
  return JSON.stringify({
    version: '2.0.0',
    updated: new Date().toISOString(),
    businesses: allBiz.map(b => ({
      id: b.id, name: b.name, category: b.category,
      keywords: b.keywords, crankEnabled: true
    })),
    freelancers: allFree.map(f => ({
      id: f.id, name: f.name, category: f.category || f.title,
      keywords: f.keywords, crankEnabled: true
    }))
  }, null, 2);
}

// ═══════════════════════════════
// BUILD
// ═══════════════════════════════
console.log('=== XIVIX Tower Control Build v2.7 ===\n');

// Clean old directories
['brands','freelancers'].forEach(d => {
  const dir = path.join(DOCS, d);
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true });
});

// Build each business
console.log('📦 매장 빌드:');
businesses.forEach(b => {
  const dir = path.join(DOCS, 'brands', b.id);
  ensureDir(dir);
  writeF(path.join(dir, 'index.html'), buildPage(b));
  writeF(path.join(dir, 'llms.txt'), buildLlms(b));
});

// Build each freelancer
if (freelancers.length) {
  console.log('\n👤 프리랜서 빌드:');
  freelancers.forEach(f => {
    const dir = path.join(DOCS, 'freelancers', f.id);
    ensureDir(dir);
    writeF(path.join(dir, 'index.html'), buildFreelancerPage(f));
    writeF(path.join(dir, 'llms.txt'), buildFreelancerLlms(f));
  });
}

// Global files
console.log('\n🌐 글로벌 파일:');
writeF(path.join(DOCS, 'index.html'), buildIndex(businesses, freelancers));
writeF(path.join(DOCS, 'llms.txt'), buildGlobalLlms(businesses, freelancers));
writeF(path.join(DOCS, 'sitemap.xml'), buildSitemap(businesses, freelancers));
writeF(path.join(DOCS, 'robots.txt'), buildRobots());
writeF(path.join(DOCS, 'crank-config.json'), buildCrankConfig(businesses, freelancers));

const totalFiles = (businesses.length + freelancers.length) * 2 + 5;
console.log(`\n=== Build Complete ===`);
console.log(`매장: ${businesses.length}개, 프리랜서: ${freelancers.length}명`);
console.log(`총 ${totalFiles}개 파일 생성`);

// ─── SEO Boost 자동 실행 ───
console.log(`\n🔥 SEO Boost 자동 실행 중...`);
const { main: seoBoost } = require('./seo-boost');
seoBoost().then(() => {
  console.log(`\n다음 단계: GitHub Desktop에서 Commit & Push`);
}).catch(err => {
  console.log(`\n⚠️ SEO Boost 실패 (빌드는 완료됨): ${err.message}`);
  console.log(`수동 실행: node scripts/seo-boost.js`);
  console.log(`\n다음 단계: GitHub Desktop에서 Commit & Push`);
});
