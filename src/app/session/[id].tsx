import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as Speech from "expo-speech";
import { reviewSession } from "@/lib/claude";
import { getApiKey, getSession, getSettings, saveSession, type Session } from "@/lib/storage";
import { colors } from "@/lib/theme";

export default function SessionReview() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);

  const generate = useCallback(async (s: Session) => {
    setLoading(true);
    setError(null);
    try {
      const key = (await getApiKey()) ?? "";
      const { level } = await getSettings();
      const review = await reviewSession(key, s.topic, level, s.transcript);
      const updated = { ...s, review };
      await saveSession(updated);
      setSession(updated);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const s = await getSession(id);
      if (!s) return;
      setSession(s);
      if (!s.review) generate(s);
    })();
    return () => {
      Speech.stop();
    };
  }, [id, generate]);

  if (!session) return <ActivityIndicator style={{ marginTop: 40 }} />;
  const { review } = session;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.date}>
        {session.date} · {Math.max(1, Math.round(session.durationSec / 60))}분
      </Text>
      <Text style={styles.topic}>{session.topic.en}</Text>
      <Text style={styles.topicKo}>{session.topic.ko}</Text>

      {loading && (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.sub}>대화를 분석하고 있어요...</Text>
        </View>
      )}
      {error && (
        <View style={styles.loadingBox}>
          <Text style={styles.error}>{error}</Text>
          <Pressable onPress={() => generate(session)}>
            <Text style={styles.link}>다시 시도</Text>
          </Pressable>
        </View>
      )}

      {review && (
        <>
          <View style={styles.card}>
            <Text style={styles.section}>💬 총평</Text>
            <Text style={styles.body}>{review.summary_ko}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.section}>✏️ 문장 교정</Text>
            {review.corrections.length === 0 ? (
              <Text style={styles.body}>고칠 문장이 거의 없었어요. 훌륭해요!</Text>
            ) : (
              review.corrections.map((c, i) => (
                <View key={i} style={styles.item}>
                  <Text style={styles.original}>{c.original}</Text>
                  <Pressable onPress={() => say(c.corrected)}>
                    <Text style={styles.corrected}>→ {c.corrected} 🔊</Text>
                  </Pressable>
                  <Text style={styles.explain}>{c.explanation_ko}</Text>
                </View>
              ))
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.section}>⭐ 오늘의 표현</Text>
            {review.expressions.map((e, i) => (
              <View key={i} style={styles.item}>
                <Pressable onPress={() => say(e.expression)}>
                  <Text style={styles.expr}>{e.expression} 🔊</Text>
                </Pressable>
                <Text style={styles.explain}>{e.meaning_ko}</Text>
                <Pressable onPress={() => say(e.example)}>
                  <Text style={styles.example}>“{e.example}”</Text>
                </Pressable>
              </View>
            ))}
          </View>

          <View style={[styles.card, { backgroundColor: colors.primarySoft }]}>
            <Text style={[styles.body, { color: colors.primary }]}>{review.encouragement_ko}</Text>
          </View>
        </>
      )}

      <Pressable onPress={() => setShowTranscript((v) => !v)}>
        <Text style={styles.link}>{showTranscript ? "대화 내용 접기" : "대화 내용 보기"}</Text>
      </Pressable>
      {showTranscript && (
        <View style={styles.card}>
          {session.transcript.map((l, i) => (
            <Text key={i} style={styles.line}>
              <Text style={{ fontWeight: "700" }}>{l.role === "user" ? "Me" : "Sam"}: </Text>
              {l.text}
            </Text>
          ))}
        </View>
      )}

      <Pressable style={styles.homeBtn} onPress={() => router.dismissTo("/")}>
        <Text style={styles.homeText}>홈으로</Text>
      </Pressable>
    </ScrollView>
  );
}

async function say(text: string) {
  const { speechRate } = await getSettings();
  Speech.stop();
  Speech.speak(text, { language: "en-US", rate: speechRate });
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 14, paddingBottom: 40 },
  date: { color: colors.sub, fontSize: 13 },
  topic: { fontSize: 22, fontWeight: "700", color: colors.text },
  topicKo: { color: colors.sub, marginTop: -8 },
  loadingBox: { alignItems: "center", gap: 10, padding: 20 },
  sub: { color: colors.sub },
  error: { color: colors.danger, textAlign: "center" },
  link: { color: colors.primary, fontWeight: "600", textAlign: "center", paddingVertical: 6 },
  card: { backgroundColor: colors.card, borderRadius: 16, padding: 16, gap: 10 },
  section: { fontSize: 16, fontWeight: "700", color: colors.text },
  body: { fontSize: 15, lineHeight: 22, color: colors.text },
  item: { gap: 4, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.line },
  original: { color: colors.sub, textDecorationLine: "line-through", fontSize: 15 },
  corrected: { color: colors.good, fontWeight: "700", fontSize: 16 },
  explain: { color: colors.text, fontSize: 14, lineHeight: 20 },
  expr: { color: colors.primary, fontWeight: "700", fontSize: 17 },
  example: { color: colors.sub, fontStyle: "italic", fontSize: 14 },
  line: { fontSize: 14, lineHeight: 21, color: colors.text },
  homeBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 6,
  },
  homeText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
