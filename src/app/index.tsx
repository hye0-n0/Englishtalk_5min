import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { computeStreak, getApiKey, getSessions, localDate, type Session } from "@/lib/storage";
import { pickTopic, type Topic } from "@/lib/topics";
import { colors } from "@/lib/theme";

export default function Home() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [topic, setTopic] = useState<Topic | null>(null);
  const [hasKey, setHasKey] = useState(true);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const list = await getSessions();
        setSessions(list);
        setHasKey(!!(await getApiKey()));
        setTopic((prev) => prev ?? pickTopic(list.map((s) => s.topic.id)));
      })();
    }, []),
  );

  const streak = computeStreak(sessions);
  const doneToday = sessions.some((s) => s.date === localDate());
  const totalMinutes = Math.round(sessions.reduce((sum, s) => sum + s.durationSec, 0) / 60);

  function shuffle() {
    setTopic(pickTopic(sessions.map((s) => s.topic.id), topic?.id));
  }

  function start() {
    if (!hasKey) return router.push("/settings");
    if (topic) router.push({ pathname: "/chat", params: { topicId: topic.id } });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Daily Talk</Text>
          <Pressable onPress={() => router.push("/settings")} hitSlop={12}>
            <Text style={styles.link}>설정</Text>
          </Pressable>
        </View>
        <Text style={styles.subtitle}>하루 5분, 영어로 수다 떨기</Text>

        <View style={styles.statsRow}>
          <Stat label="연속 학습" value={`${streak}일`} highlight={streak > 0} />
          <Stat label="총 대화" value={`${sessions.length}회`} />
          <Stat label="총 시간" value={`${totalMinutes}분`} />
        </View>

        <View style={[styles.todayBadge, doneToday && styles.todayDone]}>
          <Text style={[styles.todayText, doneToday && { color: colors.good }]}>
            {doneToday ? "✓ 오늘의 대화 완료! 한 번 더 해도 좋아요" : "오늘 아직 대화하지 않았어요"}
          </Text>
        </View>

        {topic && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>오늘의 주제</Text>
            <Text style={styles.topicEn}>{topic.en}</Text>
            <Text style={styles.topicKo}>{topic.ko}</Text>
            <Pressable onPress={shuffle} style={styles.shuffle}>
              <Text style={styles.link}>↻ 다른 주제</Text>
            </Pressable>
          </View>
        )}

        {!hasKey && (
          <Text style={styles.warn}>
            시작하려면 먼저 설정에서 Anthropic API 키를 입력해 주세요.
          </Text>
        )}

        <Pressable style={styles.startBtn} onPress={start}>
          <Text style={styles.startText}>{hasKey ? "5분 대화 시작" : "API 키 설정하기"}</Text>
        </Pressable>

        <Pressable style={styles.secondaryBtn} onPress={() => router.push("/history")}>
          <Text style={styles.secondaryText}>학습 기록 보기</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, highlight && { color: colors.accent }]}>
        {highlight ? "🔥 " : ""}
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 20, gap: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 30, fontWeight: "800", color: colors.text },
  subtitle: { fontSize: 15, color: colors.sub, marginTop: -10 },
  link: { color: colors.primary, fontSize: 15, fontWeight: "600" },
  statsRow: { flexDirection: "row", gap: 10 },
  stat: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  statValue: { fontSize: 20, fontWeight: "700", color: colors.text },
  statLabel: { fontSize: 12, color: colors.sub, marginTop: 4 },
  todayBadge: { backgroundColor: colors.primarySoft, borderRadius: 12, padding: 12 },
  todayDone: { backgroundColor: "#EBFBEE" },
  todayText: { color: colors.primary, fontWeight: "600", textAlign: "center" },
  card: { backgroundColor: colors.card, borderRadius: 18, padding: 20, gap: 6 },
  cardLabel: { fontSize: 13, color: colors.sub, fontWeight: "600" },
  topicEn: { fontSize: 22, fontWeight: "700", color: colors.text },
  topicKo: { fontSize: 15, color: colors.sub },
  shuffle: { alignSelf: "flex-start", marginTop: 8 },
  warn: { color: colors.danger, textAlign: "center" },
  startBtn: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
  },
  startText: { color: "#fff", fontSize: 18, fontWeight: "700" },
  secondaryBtn: { paddingVertical: 12, alignItems: "center" },
  secondaryText: { color: colors.primary, fontSize: 15, fontWeight: "600" },
});
