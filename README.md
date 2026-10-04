# 온빛중 웹 앱 모음

학교에서 쓰는 웹 앱을 한곳에서 찾고 여는 랜딩 페이지임. 디자인 기준은 `DESIGN.md`를 따름.

## 실행 방법

Node.js 22.20 이상이 필요함.

```bash
npm install
npm run dev
```

브라우저에서 http://localhost:3000 을 열면 됨.

## 자주 고치는 곳

| 하려는 일 | 고칠 파일 |
|---|---|
| 앱 추가·수정·삭제 | `lib/apps.ts`의 `apps` 배열 |
| 히어로의 "자주 쓰는 앱" 바꾸기 | `lib/apps.ts`에서 해당 앱의 `pinned: true` |
| 최근 소식 바꾸기 | `lib/apps.ts`의 `news` 배열 |
| 등록 요청 주소(설문지·메일) | `lib/apps.ts`의 `REGISTER_URL` |
| 색상·글꼴 | `app/globals.css` (값은 `DESIGN.md` 2장과 같게 유지) |

`lib/apps.ts`의 앱 이름, 설명, 주소(`href: "#"`)와 소식은 모두 예시이므로 실제 내용으로 바꿔야 함.
`status`를 `"준비 중"`으로 두면 카드가 눌리지 않고, `"점검 중"`이면 표시만 붙음.

## 수업 관찰 기록 앱

`public/observation/index.html` 파일 하나로 된 앱임(HTML·CSS·JavaScript, 설치 불필요).

- 랜딩 페이지에서는 `/observation/index.html` 주소로 열림.
- 파일만 따로 내려받아 브라우저로 열어도 그대로 동작함.
- 기록은 그 브라우저의 저장소(localStorage)에만 남으므로, 기기를 바꿀 때는 데이터 화면에서 JSON으로 내려받아 옮겨야 함.

## 사용 기술

Next.js 16, React 19, Tailwind CSS v4, Motion, Phosphor Icons, Pretendard(글꼴)
