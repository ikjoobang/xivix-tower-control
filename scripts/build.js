#!/usr/bin/env node
/**
 * XIVIX Tower Control - Build Script
 * 
 * businesses.json → SEO + AEO + GEO + C-RANK 최적화 페이지 자동 생성
 * 
 * 생성물:
 *   /brands/{id}/index.html    → SEO (Schema.org JSON-LD) + GEO (AI Overview 인용)
 *   /brands/{id}/llms.txt      → AEO (LLM 크롤러 최적화)
 *   /brands/{id}/faq.html      → SEO FAQ 리치스니펫
 *   /sitemap.xml               → 검색엔진 사이트맵
 *   /llms.txt                  → 사이트 전체 LLM 디렉토리
 *   /robots.txt                → 크롤러 허용 설정
 *   /index.html                → 브랜드 디렉토리 메인
 */

const fs = require('fs');
const path = require('path');

// ─── Config ───
const DATA_PATH = './_data/businesses.json';
const OUTPUT_DIR = './docs';
const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
const DOMAIN = data.meta.domain || 'brands.studioaibotbot.com';
const BASE_URL = `https://${DOMAIN}`;
const BUILD_DATE = new Date().toISOString().split('T')[0];

console.log(`🏗️  XIVIX Tower Control Build`);
console.log(`   Domain: ${DOMAIN}`);
console.log(`   Businesses: ${data.businesses.length}`);
console.log(`   Date: ${BUILD_DATE}\n`);

// ─── Clean & Create Output ───
if (fs.existsSync(OUTPUT_DIR)) {
  fs.rmSync(OUTPUT_DIR, { recursive: true });
}
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// ═══════════════════════════════════════════
// 1. Schema.org JSON-LD Generator (SEO + GEO)
// ═══════════════════════════════════════════
function generateJsonLd(biz) {
  const base = {
    "@context": "https://schema.org",
    "@type": biz.type,
    "name": biz.name,
    "alternateName": biz.name_en,
    "description": biz.description,
    "url": biz.url,
    "telephone": biz.phone,
    "address": {
      "@type": "PostalAddress",
      "streetAddress": biz.address.street,
      "addressLocality": biz.address.city,
      "addressRegion": biz.address.district,
      "postalCode": biz.address.postalCode,
      "addressCountry": biz.address.country
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": biz.geo.lat,
      "longitude": biz.geo.lng
    },
    "openingHoursSpecification": parseOpeningHours(biz.openingHours),
    "priceRange": biz.priceRange
  };

  // 리뷰 데이터
  if (biz.reviews && biz.reviews.rating) {
    base.aggregateRating = {
      "@type": "AggregateRating",
      "ratingValue": biz.reviews.rating,
      "reviewCount": biz.reviews.count,
      "bestRating": 5
    };
  }

  // 이미지
  if (biz.images) {
    base.image = Object.values(biz.images).filter(v => v);
  }

  // 소셜 링크
  const sameAs = [];
  if (biz.socialLinks) {
    Object.values(biz.socialLinks).forEach(link => {
      if (link) sameAs.push(link);
    });
  }
  if (sameAs.length > 0) base.sameAs = sameAs;

  return base;
}

// FAQ Schema (SEO 리치스니펫)
function generateFaqJsonLd(biz) {
  if (!biz.faq || biz.faq.length === 0) return null;

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": biz.faq.map(item => ({
      "@type": "Question",
      "name": item.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": item.answer
      }
    }))
  };
}

// Organization Schema (브랜드 전체)
function generateOrgJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "XIVIX",
    "alternateName": "지빅스",
    "url": BASE_URL,
    "description": "병원·매장·브랜드의 검색엔진 및 AI 검색 최적화 관리 서비스",
    "logo": `${BASE_URL}/assets/xivix-logo.png`,
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "customer service",
      "availableLanguage": ["Korean", "English"]
    }
  };
}

// 영업시간 파싱
function parseOpeningHours(hours) {
  const dayMap = {
    'Mo': 'Monday', 'Tu': 'Tuesday', 'We': 'Wednesday',
    'Th': 'Thursday', 'Fr': 'Friday', 'Sa': 'Saturday', 'Su': 'Sunday'
  };

  return hours.map(h => {
    const match = h.match(/^([A-Za-z,-]+)\s+(\d{2}:\d{2})-(\d{2}:\d{2})$/);
    if (!match) return null;

    const [, dayRange, opens, closes] = match;
    const days = expandDayRange(dayRange);

    return days.map(day => ({
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": dayMap[day] || day,
      "opens": opens,
      "closes": closes
    }));
  }).flat().filter(Boolean);
}

function expandDayRange(range) {
  const allDays = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
  const parts = range.split(',');
  const result = [];

  parts.forEach(part => {
    if (part.includes('-')) {
      const [start, end] = part.split('-');
      const si = allDays.indexOf(start);
      const ei = allDays.indexOf(end);
      if (si >= 0 && ei >= 0) {
        for (let i = si; i <= ei; i++) result.push(allDays[i]);
      }
    } else {
      result.push(part.trim());
    }
  });

  return result;
}


// ═══════════════════════════════════════
// 2. HTML Page Generator (SEO + GEO)
// ═══════════════════════════════════════
function generateHTML(biz) {
  const jsonLd = generateJsonLd(biz);
  const faqJsonLd = generateFaqJsonLd(biz);

  const faqSection = biz.faq ? biz.faq.map(f => `
      <div class="faq-item" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
        <h3 itemprop="name">${f.question}</h3>
        <div itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
          <p itemprop="text">${f.answer}</p>
        </div>
      </div>`).join('\n') : '';

  const specialtiesText = biz.specialties ? biz.specialties.join(', ') : '';

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${biz.name} | ${biz.address.district} ${biz.category}</title>
  <meta name="description" content="${biz.description}">
  <meta name="keywords" content="${(biz.keywords || []).join(', ')}">
  <link rel="canonical" href="${BASE_URL}/brands/${biz.id}/">

  <!-- Open Graph (소셜 공유) -->
  <meta property="og:title" content="${biz.name}">
  <meta property="og:description" content="${biz.description}">
  <meta property="og:type" content="business.business">
  <meta property="og:url" content="${BASE_URL}/brands/${biz.id}/">
  ${biz.images?.exterior ? `<meta property="og:image" content="${biz.images.exterior}">` : ''}

  <!-- 네이버 서치어드바이저 인증 (매장별 필요시 교체) -->
  <!-- <meta name="naver-site-verification" content="YOUR_CODE_HERE"> -->

  <!-- SEO: Schema.org JSON-LD -->
  <script type="application/ld+json">
${JSON.stringify(jsonLd, null, 2)}
  </script>

  <!-- SEO: FAQ Rich Snippet -->
  ${faqJsonLd ? `<script type="application/ld+json">
${JSON.stringify(faqJsonLd, null, 2)}
  </script>` : ''}

  <style>
    :root { --primary: #2563eb; --text: #1f2937; --bg: #f9fafb; --card: #ffffff; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif; color: var(--text); background: var(--bg); line-height: 1.7; }
    .container { max-width: 720px; margin: 0 auto; padding: 2rem 1rem; }
    .card { background: var(--card); border-radius: 12px; padding: 2rem; margin-bottom: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    h1 { font-size: 1.8rem; margin-bottom: 0.5rem; }
    h2 { font-size: 1.3rem; margin-bottom: 1rem; color: var(--primary); border-bottom: 2px solid var(--primary); padding-bottom: 0.3rem; }
    h3 { font-size: 1.05rem; margin-bottom: 0.3rem; }
    .badge { display: inline-block; background: var(--primary); color: white; padding: 0.2rem 0.8rem; border-radius: 20px; font-size: 0.85rem; margin-right: 0.3rem; margin-bottom: 0.3rem; }
    .info-row { padding: 0.5rem 0; border-bottom: 1px solid #f0f0f0; }
    .info-label { font-weight: 600; color: #6b7280; font-size: 0.9rem; }
    .rating { color: #f59e0b; font-size: 1.2rem; }
    .faq-item { padding: 1rem 0; border-bottom: 1px solid #f0f0f0; }
    .faq-item:last-child { border-bottom: none; }
    .faq-item h3 { color: var(--primary); }
    .footer { text-align: center; padding: 2rem; color: #9ca3af; font-size: 0.8rem; }
    a { color: var(--primary); text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <!-- 기본 정보 -->
    <div class="card">
      <h1>${biz.name}</h1>
      <p style="color:#6b7280; margin-bottom:1rem;">${biz.name_en} · ${biz.category}</p>
      <p>${biz.description}</p>
      ${biz.reviews ? `<p style="margin-top:0.8rem;"><span class="rating">★ ${biz.reviews.rating}</span> <span style="color:#6b7280;">(${biz.reviews.count}개 리뷰)</span></p>` : ''}
    </div>

    <!-- 상세 정보 (GEO: AI가 인용하기 좋은 명확한 텍스트) -->
    <div class="card">
      <h2>기본 정보</h2>
      <div class="info-row">
        <span class="info-label">주소</span><br>
        ${biz.address.street}, ${biz.address.district}, ${biz.address.city} ${biz.address.postalCode}
      </div>
      <div class="info-row">
        <span class="info-label">전화번호</span><br>
        <a href="tel:${biz.phone}">${biz.phone}</a>
      </div>
      <div class="info-row">
        <span class="info-label">영업시간</span><br>
        ${biz.openingHours.join('<br>')}
      </div>
      <div class="info-row">
        <span class="info-label">웹사이트</span><br>
        <a href="${biz.url}" target="_blank" rel="noopener">${biz.url}</a>
      </div>
      <div class="info-row">
        <span class="info-label">가격대</span><br>
        ${biz.priceRange}
      </div>
    </div>

    <!-- 전문 분야 -->
    <div class="card">
      <h2>전문 분야</h2>
      <p>${biz.specialties.map(s => `<span class="badge">${s}</span>`).join(' ')}</p>
    </div>

    <!-- FAQ (SEO Rich Snippet + GEO 인용) -->
    ${biz.faq && biz.faq.length > 0 ? `
    <div class="card" itemscope itemtype="https://schema.org/FAQPage">
      <h2>자주 묻는 질문</h2>
      ${faqSection}
    </div>` : ''}

    <div class="footer">
      <p>© ${new Date().getFullYear()} ${biz.name} | Managed by <a href="https://studioaibotbot.com">XIVIX</a></p>
      <p>Last updated: ${BUILD_DATE}</p>
    </div>
  </div>
</body>
</html>`;
}


// ═══════════════════════════════════════
// 3. llms.txt Generator (AEO)
// ═══════════════════════════════════════
function generateLlmsTxt(biz) {
  const faqSection = biz.faq ? biz.faq.map(f =>
    `### ${f.question}\n${f.answer}`
  ).join('\n\n') : '';

  return `# ${biz.name} (${biz.name_en})

> ${biz.description}

## 기본 정보
- 업종: ${biz.type} (${biz.category})
- 주소: ${biz.address.street}, ${biz.address.district}, ${biz.address.city} ${biz.address.postalCode}
- 전화: ${biz.phone}
- 웹사이트: ${biz.url}
- 영업시간: ${biz.openingHours.join(', ')}
- 가격대: ${biz.priceRange}
- 좌표: ${biz.geo.lat}, ${biz.geo.lng}

## 전문 분야
${biz.specialties.map(s => `- ${s}`).join('\n')}

## 검색 키워드
${(biz.keywords || []).map(k => `- ${k}`).join('\n')}

${biz.reviews ? `## 고객 평가
- 평균 평점: ${biz.reviews.rating}/5
- 리뷰 수: ${biz.reviews.count}개
- 출처: ${biz.reviews.source}` : ''}

${faqSection ? `## 자주 묻는 질문\n\n${faqSection}` : ''}

${biz.socialLinks ? `## 소셜 미디어
${Object.entries(biz.socialLinks).map(([k, v]) => `- ${k}: ${v}`).join('\n')}` : ''}

---
Managed by XIVIX (https://studioaibotbot.com)
Last updated: ${BUILD_DATE}
`;
}


// ═══════════════════════════════════════
// 4. Sitemap Generator (SEO)
// ═══════════════════════════════════════
function generateSitemap(businesses) {
  const urls = [
    { loc: `${BASE_URL}/`, priority: '1.0' },
    { loc: `${BASE_URL}/llms.txt`, priority: '0.8' },
    ...businesses.map(biz => ({
      loc: `${BASE_URL}/brands/${biz.id}/`,
      priority: '0.9'
    })),
    ...businesses.map(biz => ({
      loc: `${BASE_URL}/brands/${biz.id}/llms.txt`,
      priority: '0.7'
    }))
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemapschemas.org/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${BUILD_DATE}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;
}


// ═══════════════════════════════════════
// 5. robots.txt (SEO + AEO)
// ═══════════════════════════════════════
function generateRobotsTxt() {
  return `# XIVIX Tower Control - robots.txt
# SEO + AEO 최적화: 모든 검색엔진 및 LLM 크롤러 허용

User-agent: *
Allow: /
Disallow: /_data/

# Google
User-agent: Googlebot
Allow: /

# Google AI (Gemini, AI Overview)
User-agent: Google-Extended
Allow: /

# OpenAI (ChatGPT)
User-agent: GPTBot
Allow: /

# OpenAI (ChatGPT browsing)
User-agent: ChatGPT-User
Allow: /

# Anthropic (Claude)
User-agent: ClaudeBot
Allow: /
User-agent: anthropic-ai
Allow: /

# Microsoft (Bing, Copilot)
User-agent: bingbot
Allow: /

# Perplexity
User-agent: PerplexityBot
Allow: /

# Naver
User-agent: Yeti
Allow: /

# Common Crawl
User-agent: CCBot
Allow: /

Sitemap: ${BASE_URL}/sitemap.xml
`;
}


// ═══════════════════════════════════════
// 6. Root llms.txt (AEO - 사이트 디렉토리)
// ═══════════════════════════════════════
function generateRootLlmsTxt(businesses) {
  return `# XIVIX Brand Directory

> XIVIX가 관리하는 병원, 매장, 브랜드의 공식 정보 디렉토리입니다.
> 각 브랜드의 상세 정보는 개별 llms.txt 파일에서 확인할 수 있습니다.

## 관리 브랜드 목록

${businesses.filter(b => b.status === 'active').map(biz =>
  `### ${biz.name} (${biz.name_en})
- 업종: ${biz.category}
- 위치: ${biz.address.district}, ${biz.address.city}
- 상세정보: ${BASE_URL}/brands/${biz.id}/llms.txt
- 웹사이트: ${biz.url}`
).join('\n\n')}

---
Total active brands: ${businesses.filter(b => b.status === 'active').length}
Directory managed by: XIVIX (https://studioaibotbot.com)
Last updated: ${BUILD_DATE}
`;
}


// ═══════════════════════════════════════
// 7. Index Page (브랜드 디렉토리 메인)
// ═══════════════════════════════════════
function generateIndexHTML(businesses) {
  const orgJsonLd = generateOrgJsonLd();
  const activeBusinesses = businesses.filter(b => b.status === 'active');

  const cards = activeBusinesses.map(biz => `
        <a href="/brands/${biz.id}/" class="biz-card">
          <div class="biz-category">${biz.category}</div>
          <h3>${biz.name}</h3>
          <p class="biz-location">${biz.address.district}, ${biz.address.city}</p>
          <p class="biz-desc">${biz.description.substring(0, 80)}...</p>
          ${biz.reviews ? `<p class="biz-rating">★ ${biz.reviews.rating} (${biz.reviews.count})</p>` : ''}
        </a>`).join('\n');

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>XIVIX Brand Directory | 브랜드 검색 최적화 관리</title>
  <meta name="description" content="XIVIX가 관리하는 병원, 매장, 브랜드의 공식 정보 디렉토리. SEO, AEO, GEO, C-RANK 최적화.">
  <link rel="canonical" href="${BASE_URL}/">

  <script type="application/ld+json">
${JSON.stringify(orgJsonLd, null, 2)}
  </script>

  <style>
    :root { --primary: #2563eb; --text: #1f2937; --bg: #0f172a; --card: #1e293b; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Pretendard', -apple-system, sans-serif; color: #e2e8f0; background: var(--bg); }
    .header { text-align: center; padding: 3rem 1rem 2rem; }
    .header h1 { font-size: 2rem; color: white; }
    .header p { color: #94a3b8; margin-top: 0.5rem; }
    .stats { display: flex; justify-content: center; gap: 2rem; margin: 1.5rem 0; }
    .stat { text-align: center; }
    .stat-num { font-size: 2rem; font-weight: 700; color: var(--primary); }
    .stat-label { font-size: 0.85rem; color: #64748b; }
    .grid { max-width: 900px; margin: 0 auto; padding: 0 1rem 3rem; display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; }
    .biz-card { background: var(--card); border-radius: 12px; padding: 1.5rem; text-decoration: none; color: #e2e8f0; transition: transform 0.2s, box-shadow 0.2s; display: block; }
    .biz-card:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(37,99,235,0.15); }
    .biz-category { display: inline-block; background: rgba(37,99,235,0.2); color: var(--primary); padding: 0.15rem 0.6rem; border-radius: 12px; font-size: 0.8rem; margin-bottom: 0.5rem; }
    .biz-card h3 { font-size: 1.15rem; margin-bottom: 0.3rem; color: white; }
    .biz-location { color: #94a3b8; font-size: 0.85rem; }
    .biz-desc { color: #64748b; font-size: 0.85rem; margin-top: 0.5rem; line-height: 1.5; }
    .biz-rating { color: #f59e0b; margin-top: 0.5rem; font-size: 0.9rem; }
    .footer { text-align: center; padding: 2rem; color: #475569; font-size: 0.8rem; }
    .opt-badges { display: flex; justify-content: center; gap: 0.5rem; margin-top: 1rem; }
    .opt-badge { background: rgba(37,99,235,0.1); border: 1px solid rgba(37,99,235,0.3); color: var(--primary); padding: 0.3rem 0.8rem; border-radius: 20px; font-size: 0.8rem; font-weight: 600; }
  </style>
</head>
<body>
  <div class="header">
    <h1>XIVIX Brand Directory</h1>
    <p>병원 · 매장 · 브랜드 검색 최적화 관리</p>
    <div class="opt-badges">
      <span class="opt-badge">SEO</span>
      <span class="opt-badge">AEO</span>
      <span class="opt-badge">GEO</span>
      <span class="opt-badge">C-RANK</span>
    </div>
    <div class="stats">
      <div class="stat">
        <div class="stat-num">${activeBusinesses.length}</div>
        <div class="stat-label">관리 브랜드</div>
      </div>
      <div class="stat">
        <div class="stat-num">4</div>
        <div class="stat-label">최적화 영역</div>
      </div>
    </div>
  </div>

  <div class="grid">
    ${cards}
  </div>

  <div class="footer">
    <p>© ${new Date().getFullYear()} XIVIX Tower Control | <a href="/llms.txt" style="color:#64748b;">llms.txt</a> · <a href="/sitemap.xml" style="color:#64748b;">sitemap.xml</a></p>
  </div>
</body>
</html>`;
}


// ═══════════════════════════════════════
// 8. C-RANK Config Generator (네이버)
// ═══════════════════════════════════════
function generateCrankConfig(businesses) {
  const crankEnabled = businesses.filter(b => b.crank?.naverCafeEnabled);

  const config = {
    _comment: "C-RANK 자동화 설정 - cafe-auto-v2 연동용",
    generated: BUILD_DATE,
    businesses: crankEnabled.map(biz => ({
      id: biz.id,
      name: biz.name,
      blogAutoPost: biz.crank.blogAutoPost,
      cafeAutoPostTopics: biz.crank.cafeAutoPostTopics,
      keywords: biz.keywords,
      location: `${biz.address.district} ${biz.address.city}`
    }))
  };

  return JSON.stringify(config, null, 2);
}


// ═══════════════════════════════════════
// BUILD EXECUTION
// ═══════════════════════════════════════
const activeBiz = data.businesses.filter(b => b.status === 'active');

activeBiz.forEach(biz => {
  const dir = path.join(OUTPUT_DIR, 'brands', biz.id);
  fs.mkdirSync(dir, { recursive: true });

  // HTML (SEO + GEO)
  fs.writeFileSync(path.join(dir, 'index.html'), generateHTML(biz));
  console.log(`  ✅ ${biz.name} → index.html (SEO + GEO)`);

  // llms.txt (AEO)
  fs.writeFileSync(path.join(dir, 'llms.txt'), generateLlmsTxt(biz));
  console.log(`  ✅ ${biz.name} → llms.txt (AEO)`);
});

// Root files
fs.writeFileSync(path.join(OUTPUT_DIR, 'index.html'), generateIndexHTML(data.businesses));
console.log(`\n  ✅ index.html (Brand Directory)`);

fs.writeFileSync(path.join(OUTPUT_DIR, 'sitemap.xml'), generateSitemap(activeBiz));
console.log(`  ✅ sitemap.xml (SEO)`);

fs.writeFileSync(path.join(OUTPUT_DIR, 'robots.txt'), generateRobotsTxt());
console.log(`  ✅ robots.txt (SEO + AEO)`);

fs.writeFileSync(path.join(OUTPUT_DIR, 'llms.txt'), generateRootLlmsTxt(activeBiz));
console.log(`  ✅ llms.txt (AEO Directory)`);

// C-RANK config
fs.writeFileSync(path.join(OUTPUT_DIR, 'crank-config.json'), generateCrankConfig(activeBiz));
console.log(`  ✅ crank-config.json (C-RANK)`);

console.log(`\n🎯 Build complete!`);
console.log(`   Output: ${OUTPUT_DIR}/`);
console.log(`   Pages: ${activeBiz.length * 2 + 4} files generated`);
console.log(`   Coverage: SEO ✅ AEO ✅ GEO ✅ C-RANK ✅\n`);
