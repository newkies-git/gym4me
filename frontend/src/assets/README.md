# Gym4Me 에셋

| 파일 | 용도 |
|------|------|
| `logo.png` | 앱 로고 (헤더, 로그인 등). `import logoUrl from '@/assets/logo.png'` 후 `<img :src="logoUrl" alt="Gym4Me" />` |
| `icon.svg` | 파비콘(동일 내용이 `public/icon.svg`에 있어 `index.html`에서 사용). 벡터 아이콘, berry(#5e35b1) |
| `icon-512.png` | PWA 앱 아이콘(512×512). manifest.json 등에서 참조 |
| `bg-pattern.png` | 배경 패턴. 로그인/랜딩 등에 `background-image: url(...)` 로 사용 |

테마 기본 색상(berry `#5e35b1`)에 맞춰 제작됨.
