import { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { computeStreak, getSessions, type Session } from "@/lib/storage";
import { colors } from "@/lib/theme";

export default function History() {
  const [sessions, setSessions] = useState<Session[]>([]);

  useFocusEffect(
    useCallback(() => {
      getSessions().then(setSessions);
    }, []),
  );

  return (
    <FlatList
      data={sessions}
      keyExtractor={(s) => s.id}
      contentContainerStyle={styles.container}
      ListHeaderComponent={
        <View style={styles.summary}>
          <Text style={styles.summaryText}>
            🔥 연속 {computeStreak(sessions)}일 · 총 {sessions.length}회 ·{" "}
            {new Set(sessions.map((s) => s.date)).size}일 학습
          </Text>
        </View>
      }
      ListEmptyComponent={<Text style={styles.empty}>아직 기록이 없어요. 첫 대화를 시작해 보세요!</Text>}
      renderItem={({ item }) => (
        <Pressable
          style={styles.row}
          onPress={() => router.push({ pathname: "/session/[id]", params: { id: item.id } })}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.date}>
              {item.date} · {Math.max(1, Math.round(item.durationSec / 60))}분 ·{" "}
              {item.transcript.filter((l) => l.role === "user").length}번 말함
            </Text>
            <Text style={styles.topic}>{item.topic.en}</Text>
            {item.review && item.review.expressions[0] && (
              <Text style={styles.expr} numberOfLines={1}>
                ⭐ {item.review.expressions.map((e) => e.expression).join(" · ")}
              </Text>
            )}
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 10 },
  summary: { backgroundColor: colors.primarySoft, borderRadius: 12, padding: 12, marginBottom: 4 },
  summaryText: { color: colors.primary, fontWeight: "600", textAlign: "center" },
  empty: { textAlign: "center", color: colors.sub, marginTop: 40 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
  },
  date: { fontSize: 12, color: colors.sub },
  topic: { fontSize: 16, fontWeight: "600", color: colors.text, marginTop: 2 },
  expr: { fontSize: 13, color: colors.primary, marginTop: 4 },
  chevron: { fontSize: 24, color: colors.sub, marginLeft: 8 },
});
