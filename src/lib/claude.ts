import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type {
  BetaContentBlock,
  BetaMessageParam,
} from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { z } from "zod";
import type { Level, Line } from "./storage";
import type { Topic } from "./topics";

const MODEL = "claude-opus-5-5";
// 모델이 거절(refusal)할 경우 서버에서 권장 모델로 자동 재시도
const FALLBACK_BETA = "server-side-fallback-2026-07-01";

export class FriendlyError extends Error {}

function makeClient(apiKey: string) {
  // 개인용 앱이라 키를 기기에 저장해 직접 호출한다. 배포용이라면 서버를 거쳐야 한다.
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
}

function toFriendlyError(err: unknown): Error {
  if (err instanceof FriendlyError) return err;
  if (err instanceof Anthropic.AuthenticationError)
    return new FriendlyError("API 키가 올바르지 않아요. 설정에서 키를 확인해 주세요.");
  if (err instanceof Anthropic.PermissionDeniedError)
    return new FriendlyError("이 API 키로는 사용할 수 없어요. 콘솔에서 권한/결제 상태를 확인해 주세요.");
  if (err instanceof Anthropic.RateLimitError)
    return new FriendlyError("요청이 너무 많아요. 잠시 후 다시 시도해 주세요.");
  if (err instanceof Anthropic.APIConnectionError)
    return new FriendlyError("네트워크에 연결할 수 없어요. 인터넷 연결을 확인해 주세요.");
  if (err instanceof Anthropic.APIError)
    return new FriendlyError(`AI 서버 오류가 발생했어요 (${err.status ?? "?"}). 다시 시도해 주세요.`);
  return err instanceof Error ? err : new Error(String(err));
}

const LEVEL_GUIDE: Record<Level, string> = {
  beginner:
    "The learner is a beginner. Use short, simple sentences and common everyday words. Speak slowly and clearly. If they struggle, offer two simple answer choices.",
  intermediate:
    "The learner is intermediate. Use natural everyday English with some useful idioms and phrasal verbs, but avoid rare vocabulary.",
  advanced:
    "The learner is advanced. Talk like a native speaker would with a friend: natural idioms, nuance, and deeper follow-up questions.",
};

function chatSystemPrompt(topic: Topic, level: Level): string {
  return `You are Sam, a warm and curious English conversation partner for a Korean adult who practices speaking for about 5 minutes a day.

Today's topic: "${topic.en}".
${LEVEL_GUIDE[level]}

How to talk:
- Your replies are read aloud by text-to-speech, so write the way people speak: 1-3 short sentences, under 40 words. No markdown, lists, emoji, or stage directions.
- Keep the conversation flowing: react to what they said, share a small thought of your own, then ask one follow-up question.
- Stay roughly on today's topic, but follow the learner if they take it somewhere interesting.
- Don't correct grammar during the chat - detailed feedback is given after the session. If their meaning is unclear, naturally check what they meant ("Oh, do you mean...?"), which also models the correct phrasing.
- If the learner writes in Korean or says they don't know how to say something, give them the English phrase and invite them to try it.
- If the topic is a role-play, play the other person in that situation and stay in character.`;
}

export type ChatState = {
  // API로 보내는 원본 대화 기록 (응답 content를 그대로 보관해 다시 보낸다)
  messages: BetaMessageParam[];
};

function textOf(content: BetaContentBlock[]): string {
  return content
    .filter((b): b is Extract<BetaContentBlock, { type: "text" }> => b.type === "text")
    .map((b) => b.text)
    .join(" ")
    .trim();
}

async function sendTurn(
  apiKey: string,
  topic: Topic,
  level: Level,
  messages: BetaMessageParam[],
): Promise<{ reply: string; messages: BetaMessageParam[] }> {
  try {
    const response = await makeClient(apiKey).beta.messages.create({
      model: MODEL,
      max_tokens: 8000,
      betas: [FALLBACK_BETA],
      fallbacks: "default",
      output_config: { effort: "low" }, // 대화는 빠른 응답이 중요
      system: chatSystemPrompt(topic, level),
      messages,
    });
    if (response.stop_reason === "refusal") {
      throw new FriendlyError("이 내용에는 답할 수 없어요. 다른 이야기로 이어가 볼까요?");
    }
    const reply = textOf(response.content);
    return {
      reply,
      // 응답 블록(thinking 포함)을 수정 없이 그대로 기록에 붙인다
      messages: [
        ...messages,
        { role: "assistant", content: response.content },
      ],
    };
  } catch (err) {
    throw toFriendlyError(err);
  }
}

export async function startChat(apiKey: string, topic: Topic, level: Level) {
  const messages: BetaMessageParam[] = [
    {
      role: "user",
      content: `(Session start. Greet me briefly and ask an easy opening question about today's topic: "${topic.en}".)`,
    },
  ];
  return sendTurn(apiKey, topic, level, messages);
}

export async function continueChat(
  apiKey: string,
  topic: Topic,
  level: Level,
  history: BetaMessageParam[],
  userText: string,
) {
  return sendTurn(apiKey, topic, level, [...history, { role: "user", content: userText }]);
}

// ---- 세션 종료 후 피드백 ----
export const ReviewSchema = z.object({
  summary_ko: z.string().describe("오늘 대화에 대한 2-3문장 한국어 총평"),
  corrections: z
    .array(
      z.object({
        original: z.string().describe("학습자가 실제로 말한 문장"),
        corrected: z.string().describe("자연스럽게 고친 문장"),
        explanation_ko: z.string().describe("무엇이 왜 어색했는지 한국어로 짧게 설명"),
      }),
    )
    .describe("교정이 필요한 학습자 문장. 가장 도움이 될 것부터 최대 6개"),
  expressions: z
    .array(
      z.object({
        expression: z.string().describe("오늘 주제에서 쓸 수 있는 유용한 영어 표현"),
        meaning_ko: z.string().describe("한국어 뜻"),
        example: z.string().describe("오늘 대화 맥락에 맞춘 예문"),
      }),
    )
    .describe("오늘의 표현 3-5개"),
  encouragement_ko: z.string().describe("다음 연습을 위한 한 줄 격려와 팁 (한국어)"),
});

export type Review = z.infer<typeof ReviewSchema>;

export async function reviewSession(
  apiKey: string,
  topic: Topic,
  level: Level,
  transcript: Line[],
): Promise<Review> {
  const dialogue = transcript
    .map((l) => `${l.role === "user" ? "Learner" : "Sam"}: ${l.text}`)
    .join("\n");

  try {
    const response = await makeClient(apiKey).beta.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      betas: [FALLBACK_BETA],
      fallbacks: "default",
      output_config: { effort: "medium", format: betaZodOutputFormat(ReviewSchema) },
      system: `You are an experienced English tutor for Korean adult learners (${level} level). You review a short spoken conversation practice and give feedback in Korean (explanations) with English examples.
- Focus on the learner's lines only. Learner lines come from speech recognition, so ignore missing punctuation, capitalization, and obvious recognition errors.
- Prioritize corrections that make the learner sound more natural, not just grammatically correct. If a sentence is already fine, don't include it. If the learner did well, it's fine to return few or no corrections.
- Pick expressions the learner could have used today and will reuse in real life.
- Be warm and specific.`,
      messages: [
        {
          role: "user",
          content: `Topic: ${topic.en}\n\nConversation:\n${dialogue}`,
        },
      ],
    });
    if (response.stop_reason === "refusal" || !response.parsed_output) {
      throw new FriendlyError("피드백을 만들지 못했어요. 다시 시도해 주세요.");
    }
    return response.parsed_output;
  } catch (err) {
    throw toFriendlyError(err);
  }
}
