import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack, useLocalSearchParams } from "expo-router";
import * as Speech from "expo-speech";
import type { BetaMessageParam } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { continueChat, startChat } from "@/lib/claude";
import { speechRecognitionSupported, useSpeechInput } from "@/lib/speech";
import {
  DEFAULT_SETTINGS,
  getApiKey,
  getSettings,
  localDate,
  saveSession,
  type Line,
  type Settings,
} from "@/lib/storage";
import { TOPICS } from "@/lib/topics";
import { colors, SESSION_SECONDS } from "@/lib/theme";

export default function Chat() {
  const { topicId } = useLocalSearchParams<{ topicId: string }>();
  const topic = TOPICS.find((t) => t.id === topicId) ?? TOPICS[0];

  const [lines, setLines] = useState<Line[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(SESSION_SECONDS);
  const [showHint, setShowHint] = useState(false);

  const history = useRef<BetaMessageParam[]>([]);
  const apiKey = useRef("");
  const settings = useRef<Settings>(DEFAULT_SETTINGS);
  const startedAt = useRef(0);
  const sessionId = useRef(`${Date.now()}`);
  const listRef = useRef<FlatList<Line>>(null);

  const speech = useSpeechInput((text) =>
    setInput((prev) => (prev ? `${prev} ${text}` : text)),
  );

  function speak(text: string) {
    if (!settings.current.autoSpeak) return;
    Speech.stop();
    Speech.speak(text, { language: "en-US", rate: settings.current.speechRate });
  }

  // 첫 인사 받아오기
  useEffect(() => {
    (async () => {
      apiKey.current = (await getApiKey()) ?? "";
      settings.current = await getSettings();
      try {
        const { reply, messages } = await startChat(apiKey.current, topic, settings.current.level);
        history.current = messages;
        setLines([{ role: "assistant", text: reply }]);
        startedAt.current = Date.now();
        speak(reply);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      Speech.stop();
      speech.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 5분 타이머 (첫 응답이 온 뒤부터)
  const timerStarted = lines.length > 0;
  useEffect(() => {
    if (!timerStarted) return;
    const id = setInterval(() => {
      const left = SESSION_SECONDS - Math.floor((Date.now() - startedAt.current) / 1000);
      setRemaining(Math.max(0, left));
    }, 500);
    return () => clearInterval(id);
  }, [timerStarted]);

  const timeUp = remaining === 0;
  const userTurns = lines.filter((l) => l.role === "user").length;

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    speech.stop();
    Speech.stop();
    setInput("");
    setError(null);
    setLines((prev) => [...prev, { role: "user", text }]);
    setLoading(true);
    try {
      const { reply, messages } = await continueChat(
        apiKey.current,
        topic,
        settings.current.level,
        history.current,
        text,
      );
      history.current = messages;
      setLines((prev) => [...prev, { role: "assistant", text: reply }]);
      speak(reply);
    } catch (e) {
      // 실패한 사용자 발화는 입력창으로 되돌려 다시 보낼 수 있게 한다
      setLines((prev) => prev.slice(0, -1));
      setInput(text);
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function finish() {
    Speech.stop();
    speech.stop();
    if (userTurns === 0) return router.back();
    const durationSec = Math.min(
      Math.round((Date.now() - startedAt.current) / 1000),
      60 * 60,
    );
    await saveSession({
      id: sessionId.current,
      date: localDate(),
      startedAt: startedAt.current,
      durationSec,
      topic,
      transcript: lines,
    });
    router.replace({ pathname: "/session/[id]", params: { id: sessionId.current } });
  }

  function toggleMic() {
    if (speech.listening) speech.stop();
    else {
      Speech.stop();
      speech.start();
    }
  }

  const mm = Math.floor(remaining / 60);
  const ss = String(remaining % 60).padStart(2, "0");

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <Stack.Screen
        options={{
          headerTitle: () => (
            <Text style={[styles.timer, timeUp && { color: colors.good }]}>
              {timeUp ? "5분 완료!" : `${mm}:${ss}`}
            </Text>
          ),
          headerRight: () => (
            <Pressable onPress={finish} hitSlop={10}>
              <Text style={styles.finish}>{userTurns > 0 ? "마치기" : "나가기"}</Text>
            </Pressable>
          ),
        }}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
      >
        <View style={styles.topicBar}>
          <Text style={styles.topicText} numberOfLines={1}>
            {topic.en}
          </Text>
          <Pressable onPress={() => setShowHint((v) => !v)}>
            <Text style={styles.hintToggle}>{showHint ? "닫기" : "주제 뜻"}</Text>
          </Pressable>
        </View>
        {showHint && <Text style={styles.hint}>{topic.ko}</Text>}

        <FlatList
          ref={listRef}
          data={lines}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => (
            <Pressable
              onPress={() =>
                item.role === "assistant" &&
                Speech.speak(item.text, { language: "en-US", rate: settings.current.speechRate })
              }
              style={[styles.bubble, item.role === "user" ? styles.me : styles.ai]}
            >
              <Text style={[styles.bubbleText, item.role === "user" && { color: "#fff" }]}>
                {item.text}
              </Text>
              {item.role === "assistant" && <Text style={styles.replay}>🔊 탭해서 다시 듣기</Text>}
            </Pressable>
          )}
          ListFooterComponent={
            <>
              {loading && <ActivityIndicator style={{ marginTop: 12 }} color={colors.primary} />}
              {error && <Text style={styles.error}>{error}</Text>}
              {timeUp && !loading && (
                <Pressable style={styles.doneCard} onPress={finish}>
                  <Text style={styles.doneText}>오늘 5분을 채웠어요! 🎉 마치고 피드백 받기 →</Text>
                </Pressable>
              )}
            </>
          }
        />

        {speech.error && <Text style={styles.error}>{speech.error}</Text>}
        <View style={styles.inputRow}>
          {speechRecognitionSupported && (
            <Pressable
              onPress={toggleMic}
              style={[styles.mic, speech.listening && styles.micOn]}
              disabled={loading && lines.length === 0}
            >
              <Text style={styles.micIcon}>{speech.listening ? "■" : "🎤"}</Text>
            </Pressable>
          )}
          <TextInput
            style={styles.input}
            value={speech.listening && speech.partial ? `${input} ${speech.partial}`.trim() : input}
            onChangeText={setInput}
            placeholder={speech.listening ? "듣고 있어요..." : "영어로 말하거나 입력하세요"}
            placeholderTextColor={colors.sub}
            multiline
            editable={!speech.listening}
          />
          <Pressable
            onPress={send}
            style={[styles.send, (!input.trim() || loading) && { opacity: 0.4 }]}
            disabled={!input.trim() || loading}
          >
            <Text style={styles.sendText}>전송</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  timer: { fontSize: 18, fontWeight: "700", color: colors.text, fontVariant: ["tabular-nums"] },
  finish: { color: colors.primary, fontSize: 16, fontWeight: "700" },
  topicBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.primarySoft,
  },
  topicText: { flex: 1, color: colors.primary, fontWeight: "600" },
  hintToggle: { color: colors.primary, fontSize: 13 },
  hint: { paddingHorizontal: 16, paddingVertical: 6, color: colors.sub },
  list: { padding: 16, gap: 10 },
  bubble: { maxWidth: "85%", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  me: { alignSelf: "flex-end", backgroundColor: colors.bubbleMe, borderBottomRightRadius: 4 },
  ai: { alignSelf: "flex-start", backgroundColor: colors.bubbleAi, borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 17, lineHeight: 24, color: colors.text },
  replay: { fontSize: 11, color: colors.sub, marginTop: 4 },
  error: { color: colors.danger, textAlign: "center", marginVertical: 8, paddingHorizontal: 16 },
  doneCard: { backgroundColor: "#EBFBEE", borderRadius: 14, padding: 14, marginTop: 8 },
  doneText: { color: colors.good, fontWeight: "700", textAlign: "center" },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.card,
  },
  mic: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  micOn: { backgroundColor: colors.danger },
  micIcon: { fontSize: 20, color: "#fff" },
  input: {
    flex: 1,
    minHeight: 46,
    maxHeight: 120,
    borderRadius: 14,
    backgroundColor: colors.bg,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 16,
    color: colors.text,
  },
  send: {
    height: 46,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: "center",
  },
  sendText: { color: "#fff", fontWeight: "700" },
});
