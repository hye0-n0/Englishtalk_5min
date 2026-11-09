export type Topic = {
  id: string;
  en: string;
  ko: string;
};

// 매일 다른 주제로 대화하기 위한 주제 풀. 최근에 사용한 주제는 피해서 고른다.
export const TOPICS: Topic[] = [
  { id: "weekend", en: "Your plans for this weekend", ko: "이번 주말 계획" },
  { id: "food", en: "Your favorite food and where to eat it", ko: "좋아하는 음식과 맛집" },
  { id: "travel-dream", en: "A place you want to travel to someday", ko: "언젠가 가보고 싶은 여행지" },
  { id: "travel-memory", en: "The most memorable trip you've taken", ko: "가장 기억에 남는 여행" },
  { id: "morning", en: "Your morning routine", ko: "나의 아침 루틴" },
  { id: "work", en: "What you do at work or school", ko: "회사/학교에서 하는 일" },
  { id: "hobby", en: "A hobby you enjoy or want to start", ko: "즐기는 취미, 시작하고 싶은 취미" },
  { id: "movie", en: "A movie or TV show you watched recently", ko: "최근에 본 영화나 드라마" },
  { id: "music", en: "Music you've been listening to lately", ko: "요즘 듣는 음악" },
  { id: "book", en: "A book that changed how you think", ko: "생각을 바꾼 책" },
  { id: "childhood", en: "A favorite childhood memory", ko: "어린 시절의 좋은 기억" },
  { id: "friend", en: "Your best friend and how you met", ko: "가장 친한 친구와 만난 이야기" },
  { id: "family", en: "Family traditions and holidays", ko: "가족 전통과 명절" },
  { id: "cooking", en: "Cooking at home vs. eating out", ko: "집밥 vs 외식" },
  { id: "coffee", en: "Coffee, tea, and cafe culture", ko: "커피, 차, 카페 문화" },
  { id: "exercise", en: "How you stay healthy and active", ko: "건강을 유지하는 방법" },
  { id: "sleep", en: "Sleep habits and how to rest well", ko: "수면 습관과 휴식" },
  { id: "stress", en: "How you deal with stress", ko: "스트레스 해소법" },
  { id: "tech", en: "An app or gadget you can't live without", ko: "없으면 못 사는 앱이나 기기" },
  { id: "ai", en: "How AI is changing everyday life", ko: "AI가 바꾸는 일상" },
  { id: "social-media", en: "The good and bad sides of social media", ko: "SNS의 장단점" },
  { id: "shopping", en: "Online shopping vs. shopping in stores", ko: "온라인 쇼핑 vs 매장 쇼핑" },
  { id: "money", en: "Saving money and spending habits", ko: "저축과 소비 습관" },
  { id: "city", en: "Living in a big city vs. the countryside", ko: "도시 생활 vs 시골 생활" },
  { id: "hometown", en: "Your hometown and what makes it special", ko: "내 고향의 특별한 점" },
  { id: "weather", en: "Your favorite season and why", ko: "좋아하는 계절과 이유" },
  { id: "pets", en: "Pets and animals you like", ko: "반려동물과 좋아하는 동물" },
  { id: "goals", en: "A goal you're working toward this year", ko: "올해 이루고 싶은 목표" },
  { id: "learning", en: "Why you're learning English", ko: "영어를 배우는 이유" },
  { id: "job-dream", en: "Your dream job", ko: "꿈의 직업" },
  { id: "restaurant", en: "Ordering at a restaurant (role-play)", ko: "식당에서 주문하기 (롤플레이)" },
  { id: "airport", en: "Checking in at the airport (role-play)", ko: "공항 체크인 (롤플레이)" },
  { id: "hotel", en: "A problem with your hotel room (role-play)", ko: "호텔 방 문제 해결 (롤플레이)" },
  { id: "directions", en: "Asking for directions in a new city (role-play)", ko: "낯선 도시에서 길 묻기 (롤플레이)" },
  { id: "interview", en: "A job interview (role-play)", ko: "면접 (롤플레이)" },
  { id: "small-talk", en: "Small talk with a new coworker (role-play)", ko: "새 동료와 스몰토크 (롤플레이)" },
  { id: "doctor", en: "Describing symptoms to a doctor (role-play)", ko: "병원에서 증상 설명하기 (롤플레이)" },
  { id: "news", en: "An interesting piece of news you saw recently", ko: "최근 본 흥미로운 뉴스" },
  { id: "culture", en: "Explaining Korean culture to a foreigner", ko: "외국인에게 한국 문화 설명하기" },
  { id: "would-you-rather", en: "\"Would you rather\" questions", ko: "밸런스 게임 질문" },
  { id: "superpower", en: "If you could have one superpower", ko: "초능력을 하나 가질 수 있다면" },
  { id: "future", en: "What your life might look like in 10 years", ko: "10년 후의 나" },
  { id: "regret", en: "Advice you'd give your younger self", ko: "어린 나에게 해주고 싶은 조언" },
  { id: "environment", en: "Small things you do for the environment", ko: "환경을 위해 하는 작은 실천" },
];

export function pickTopic(recentTopicIds: string[], excludeId?: string): Topic {
  const recent = new Set(recentTopicIds.slice(0, 20));
  if (excludeId) recent.add(excludeId);
  let pool = TOPICS.filter((t) => !recent.has(t.id));
  if (pool.length === 0) pool = TOPICS.filter((t) => t.id !== excludeId);
  return pool[Math.floor(Math.random() * pool.length)];
}
