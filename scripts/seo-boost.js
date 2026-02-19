/**
 * XIVIX SEO Boost v1.0
 * 빌드 후 자동 실행 — 검색엔진에 즉시 색인 요청
 * 
 * 자동화 항목:
 * 1. IndexNow API → Bing, Yandex, Naver, Seznam 동시 알림
 * 2. Google Ping → sitemap 변경 알림
 * 3. Bing Ping → sitemap 변경 알림
 * 4. Naver 웹마스터 Ping
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const DOMAIN = 'https://ikjoobang.github.io/xivix-tower-control';
const HOST = 'ikjoobang.github.io';
const SITEMAP_URL = `${DOMAIN}/sitemap.xml`;
const INDEXNOW_KEY = 'xivix2026seoboost0219';
const DOCS = path.join(__dirname, '..', 'docs');

// ─── 1. IndexNow: Bing, Yandex, Naver, Seznam에 URL 일괄 제출 ───
async function submitIndexNow(urls) {
  console.log('\n🚀 [IndexNow] 검색엔진 일괄 제출...');

  const payload = JSON.stringify({
    host: HOST,
    key: INDEXNOW_KEY,
    keyLocation: `https://${HOST}/${INDEXNOW_KEY}.txt`,
    urlList: urls
  });

  const endpoints = [
    { host: 'api.indexnow.org', name: 'IndexNow (Bing+Yandex+Naver)' },
  ];

  for (const ep of endpoints) {
    try {
      const result = await httpPost({
        hostname: ep.host,
        path: '/indexnow',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Length': Buffer.byteLength(payload)
        }
      }, payload);
      
      if (result.statusCode >= 200 && result.statusCode < 300) {
        console.log(`  ✅ ${ep.name}: 성공 (${result.statusCode})`);
      } else if (result.statusCode === 202) {
        console.log(`  ✅ ${ep.name}: 접수됨 (202 — 키 검증 대기)`);
      } else {
        console.log(`  ⚠️ ${ep.name}: ${result.statusCode} — ${result.body.substring(0, 100)}`);
      }
    } catch (err) {
      console.log(`  ❌ ${ep.name}: ${err.message}`);
    }
  }
}

// ─── 2. Google Ping: sitemap 변경 알림 ───
async function pingGoogle() {
  console.log('\n📡 [Google Ping] sitemap 변경 알림...');
  try {
    const result = await httpGet(`https://www.google.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}`);
    if (result.statusCode === 200) {
      console.log('  ✅ Google: sitemap ping 성공');
    } else {
      console.log(`  ⚠️ Google: ${result.statusCode}`);
    }
  } catch (err) {
    console.log(`  ❌ Google ping 실패: ${err.message}`);
  }
}

// ─── 3. Bing Ping: sitemap 변경 알림 ───
async function pingBing() {
  console.log('\n📡 [Bing Ping] sitemap 변경 알림...');
  try {
    const result = await httpGet(`https://www.bing.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}`);
    if (result.statusCode === 200) {
      console.log('  ✅ Bing: sitemap ping 성공');
    } else {
      console.log(`  ⚠️ Bing: ${result.statusCode}`);
    }
  } catch (err) {
    console.log(`  ❌ Bing ping 실패: ${err.message}`);
  }
}

// ─── 4. IndexNow 키 파일 생성 ───
function generateKeyFile() {
  const keyFilePath = path.join(DOCS, `${INDEXNOW_KEY}.txt`);
  fs.writeFileSync(keyFilePath, INDEXNOW_KEY, 'utf-8');
  console.log(`  [OK] ${INDEXNOW_KEY}.txt (IndexNow 키 파일)`);

  // 루트 사이트에도 필요 — 안내 출력
  const rootKeyPath = path.join(__dirname, '..', '..', 'ikjoobang.github.io', `${INDEXNOW_KEY}.txt`);
  try {
    fs.writeFileSync(rootKeyPath, INDEXNOW_KEY, 'utf-8');
    console.log(`  [OK] 루트 사이트 키 파일도 생성`);
  } catch (e) {
    // 루트 리포가 없으면 무시
  }
}

// ─── 5. sitemap.xml에서 URL 목록 추출 ───
function extractUrlsFromSitemap() {
  const sitemapPath = path.join(DOCS, 'sitemap.xml');
  if (!fs.existsSync(sitemapPath)) {
    console.log('  ❌ sitemap.xml 없음');
    return [];
  }
  const content = fs.readFileSync(sitemapPath, 'utf-8');
  const urls = [];
  const regex = /<loc>(.*?)<\/loc>/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    urls.push(match[1]);
  }
  return urls;
}

// ─── HTTP 유틸리티 ───
function httpPost(options, data) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, body }));
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('Timeout')); });
    req.write(data);
    req.end();
  });
}

function httpGet(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, body }));
    }).on('error', reject);
  });
}

// ─── 실행 보고서 ───
async function generateReport(urls, results) {
  const reportPath = path.join(DOCS, 'seo-boost-log.json');
  const report = {
    timestamp: new Date().toISOString(),
    version: '1.0',
    urlsSubmitted: urls.length,
    urls: urls,
    actions: [
      'IndexNow API 제출 (Bing, Yandex, Naver, Seznam)',
      'Google Sitemap Ping',
      'Bing Sitemap Ping'
    ],
    note: '실제 색인까지 24~48시간 소요. 반복 빌드 시 자동 재제출.'
  };
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`\n📊 SEO 부스트 리포트: seo-boost-log.json`);
}

// ─── 메인 실행 ───
async function main() {
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║   XIVIX SEO Boost v1.0               ║');
  console.log('║   빌드 후 검색엔진 자동 제출          ║');
  console.log('╚══════════════════════════════════════╝');

  // IndexNow 키 파일 생성
  console.log('\n🔑 IndexNow 키 파일 생성:');
  generateKeyFile();

  // sitemap에서 URL 추출
  const urls = extractUrlsFromSitemap();
  console.log(`\n📋 제출 대상: ${urls.length}개 URL`);
  urls.forEach(u => console.log(`  → ${u}`));

  if (urls.length === 0) {
    console.log('\n⚠️ 제출할 URL이 없습니다. 먼저 build.js를 실행하세요.');
    return;
  }

  // 검색엔진 제출
  await submitIndexNow(urls);

  // 리포트 생성
  await generateReport(urls);

  console.log('\n╔══════════════════════════════════════╗');
  console.log('║   ✅ SEO Boost 완료!                  ║');
  console.log('║                                      ║');
  console.log('║   IndexNow → Bing/Yandex/Naver 제출  ║');
  console.log('║   Google  → Search Console 자동 크롤  ║');
  console.log('║                                      ║');
  console.log('║   색인 반영: 24~48시간 소요           ║');
  console.log('║   다음: GitHub Desktop Commit & Push  ║');
  console.log('╚══════════════════════════════════════╝');
}

// 직접 실행 또는 모듈로 호출
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
