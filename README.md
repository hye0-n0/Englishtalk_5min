# Daily Talk — 하루 5분 영어 회화

매일 다른 주제로 AI 친구 "Sam"과 5분 동안 영어로 대화하고, 끝나면 문장 교정과 오늘의 표현을 받는 모바일 앱 (Expo / React Native).

## 기능
- **매일 다른 주제**: 44개 주제(일상 대화와 롤플레이) 중 최근에 한 주제는 빼고 고름. "다른 주제" 버튼으로 바꿀 수 있음
- **음성 + 텍스트 대화**: 🎤로 말하면 음성 인식으로 입력되고, AI 답변은 TTS로 읽어줌 (말풍선을 탭하면 다시 들을 수 있음)
- **5분 타이머**: 시간이 다 되면 마무리 안내가 뜸 (원하면 계속 대화해도 됨)
- **대화 후 피드백**: 총평, 문장 교정(원문 → 교정 + 한국어 설명), 오늘의 표현 3~5개와 예문
- **학습 기록**: 날짜별 대화와 피드백 저장, 연속 학습일(🔥 streak), 총 횟수와 시간
- **설정**: 영어 수준(초급/중급/고급), 자동 읽기, 읽기 속도

## 준비물
1. **Node.js 22 이상** (현재 v20이면 업그레이드를 권장)
2. **Anthropic API 키**: https://console.anthropic.com 에서 가입 → Billing에서 크레딧 충전 → API Keys에서 키 생성 (`sk-ant-...`)
3. 휴대폰에 **Expo Go** 앱, 또는 음성 인식까지 쓰려면 개발 빌드 (아래 참고)

## 실행
```bash
cd daily-talk
npm install
npx expo start
```
- **Expo Go로 빠르게 실행**: QR 코드를 스캔하면 됨. 단, Expo Go에서는 🎤 음성 인식을 쓸 수 없음 → 키보드의 받아쓰기(🎙)로 대신 말할 수 있음. TTS는 정상 작동함.
- **음성 인식까지 쓰기 (개발 빌드)**:
  - iOS (Mac + Xcode 필요): `npx expo run:ios --device`
  - Android: `npx expo run:android`
  - 또는 클라우드 빌드: `npx eas-cli@latest build --profile development`

앱을 처음 열면 **설정 → API 키**를 입력하세요. 키는 기기의 보안 저장소(SecureStore)에만 저장됩니다.

## 구조
```
src/app/_layout.tsx      Stack 네비게이션
src/app/index.tsx        홈 (오늘의 주제, streak, 시작)
src/app/chat.tsx         대화 화면 (타이머, 음성 입력, TTS)
src/app/session/[id].tsx 피드백 화면 (생성하고 기록에서 다시 보기)
src/app/history.tsx      학습 기록
src/app/settings.tsx     API 키, 수준, 음성 설정
src/lib/claude.ts        Claude API (대화와 구조화된 피드백)
src/lib/speech.ts        음성 인식 (Expo Go면 자동으로 끔)
src/lib/storage.ts       기록, 설정 저장, streak 계산
src/lib/topics.ts        주제 목록
```

## 모델과 비용
- 모델: `claude-opus-5-5` (대화는 `effort: low`로 빠르게, 피드백은 `medium`)
- 5분 대화 1회에 대략 몇십 원 수준 (대화 길이에 따라 다름)
- 더 아끼려면 `src/lib/claude.ts`의 `MODEL`을 `claude-sonnet-5-5`나 `claude-haiku-5-5`로 바꾸면 됨. Haiku는 `fallbacks` 옵션을 지원하지 않으니 그 두 줄도 함께 지울 것.

## 주의
개인용으로 쓰도록 API 키를 앱에서 바로 사용합니다. 다른 사람에게 배포하려면 키를 서버에 두고 앱은 그 서버를 거쳐 호출하도록 바꿔야 합니다.
