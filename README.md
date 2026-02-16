# XIVIX Tower Control 🗼

**매장/병원/브랜드의 검색엔진 + AI 검색 노출을 중앙에서 관리하는 시스템**

## 4대 최적화

| 최적화 | 설명 | 생성 파일 |
|--------|------|-----------|
| **SEO** | 구글/네이버 검색 최적화 | Schema.org JSON-LD, sitemap.xml, meta tags |
| **AEO** | AI 엔진 최적화 (ChatGPT, Claude, Gemini) | llms.txt |
| **GEO** | 생성형 검색 최적화 (AI Overview) | 구조화된 HTML + FAQ |
| **C-RANK** | 네이버 콘텐츠 신뢰도 | crank-config.json → cafe-auto-v2 연동 |

## 사용법

### 1. 매장 추가/수정

`_data/businesses.json` 편집 → Commit & Push → 자동 빌드·배포

### 2. 로컬 빌드

```bash
npm run build    # dist/ 폴더에 결과물 생성
npm run dev      # 로컬 서버에서 미리보기
```

### 3. 배포

GitHub Pages 자동 배포 (businesses.json 변경 시 자동 트리거)

## 프로젝트 구조

```
xivix-tower-control/
├── _data/
│   └── businesses.json        ← 매장 정보 (이것만 수정하면 됨)
├── scripts/
│   └── build.js               ← 빌드 스크립트
├── .github/workflows/
│   └── deploy.yml             ← GitHub Actions 자동 배포
├── dist/                      ← 빌드 결과물 (자동 생성)
│   ├── index.html             ← 브랜드 디렉토리 메인
│   ├── sitemap.xml            ← SEO 사이트맵
│   ├── robots.txt             ← 크롤러 허용 설정
│   ├── llms.txt               ← AEO 디렉토리
│   ├── crank-config.json      ← C-RANK 자동화 설정
│   └── brands/
│       ├── gangnam-smile-dental/
│       │   ├── index.html     ← SEO + GEO 최적화 페이지
│       │   └── llms.txt       ← AEO 최적화 데이터
│       └── yeoksam-bbq/
│           ├── index.html
│           └── llms.txt
└── README.md
```

## 운영 플로우

```
매장 사장님 → 정보 전달 → XIVIX 관리자
                              ↓
                    businesses.json 수정
                              ↓
                    GitHub Desktop → Push
                              ↓
                    GitHub Actions 자동 실행
                              ↓
               ┌──────────────┼──────────────┐
               ↓              ↓              ↓
           SEO+GEO          AEO          C-RANK
        (HTML+JSON-LD)   (llms.txt)   (cafe-auto-v2)
               ↓              ↓              ↓
         구글/네이버      LLM 답변      네이버 검색
         검색 노출        에 인용        콘텐츠 노출
```

## 라이선스

MIT - XIVIX (https://studioaibotbot.com)
