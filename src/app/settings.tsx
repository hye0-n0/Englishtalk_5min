import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import * as Speech from "expo-speech";
import { speechRecognitionSupported } from "@/lib/speech";
import {
  DEFAULT_SETTINGS,
  getApiKey,
  getSettings,
  saveSettings,
  setApiKey,
  type Level,
  type Settings,
} from "@/lib/storage";
import { colors } from "@/lib/theme";

const LEVELS: { value: Level; label: string }[] = [
  { value: "beginner", label: "초급" },
  { value: "intermediate", label: "중급" },
  { value: "advanced", label: "고급" },
];

const RATES = [
  { value: 0.8, label: "느리게" },
  { value: 0.95, label: "보통" },
  { value: 1.1, label: "빠르게" },
];

export default function SettingsScreen() {
  const [key, setKey] = useState("");
  const [savedKey, setSavedKey] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  useEffect(() => {
    (async () => {
      const k = await getApiKey();
      setSavedKey(!!k);
      setSettings(await getSettings());
    })();
  }, []);

  function update(patch: Partial<Settings>) {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveSettings(next);
  }

  async function saveKey() {
    await setApiKey(key);
    setSavedKey(!!key.trim());
    setKey("");
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.label}>Anthropic API 키</Text>
        <Text style={styles.help}>
          console.anthropic.com → API Keys에서 발급한 키(sk-ant-...)를 붙여넣으세요. 키는 이 기기의
          보안 저장소에만 저장됩니다.
        </Text>
        <TextInput
          style={styles.input}
          value={key}
          onChangeText={setKey}
          placeholder={savedKey ? "저장됨 (변경하려면 새 키 입력)" : "sk-ant-..."}
          placeholderTextColor={colors.sub}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
        />
        <Pressable style={[styles.btn, !key.trim() && { opacity: 0.4 }]} onPress={saveKey} disabled={!key.trim()}>
          <Text style={styles.btnText}>저장</Text>
        </Pressable>
        {savedKey && <Text style={styles.ok}>✓ API 키가 저장되어 있어요</Text>}
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>영어 수준</Text>
        <Segmented options={LEVELS} value={settings.level} onChange={(level) => update({ level })} />
      </View>

      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.label}>AI 답변 자동 읽기</Text>
          <Switch value={settings.autoSpeak} onValueChange={(autoSpeak) => update({ autoSpeak })} />
        </View>
        <Text style={styles.label}>읽기 속도</Text>
        <Segmented
          options={RATES}
          value={settings.speechRate}
          onChange={(speechRate) => {
            update({ speechRate });
            Speech.stop();
            Speech.speak("This is how fast I'll talk.", { language: "en-US", rate: speechRate });
          }}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>음성 인식</Text>
        <Text style={styles.help}>
          {speechRecognitionSupported
            ? "사용 가능 ✓ 대화 화면의 🎤 버튼으로 말하세요."
            : "Expo Go에서는 음성 인식을 쓸 수 없어요. 개발 빌드(npx expo run:ios / run:android)로 실행하면 🎤 버튼이 나타납니다. 지금은 키보드의 받아쓰기(🎙) 기능으로 대신 말할 수 있어요."}
        </Text>
      </View>
    </ScrollView>
  );
}

function Segmented<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.segment}>
      {options.map((o) => (
        <Pressable
          key={String(o.value)}
          onPress={() => onChange(o.value)}
          style={[styles.segItem, o.value === value && styles.segActive]}
        >
          <Text style={[styles.segText, o.value === value && { color: "#fff" }]}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 14 },
  card: { backgroundColor: colors.card, borderRadius: 16, padding: 16, gap: 10 },
  label: { fontSize: 15, fontWeight: "700", color: colors.text },
  help: { fontSize: 13, color: colors.sub, lineHeight: 19 },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: colors.text,
  },
  btn: { backgroundColor: colors.primary, borderRadius: 10, padding: 12, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "700" },
  ok: { color: colors.good, fontWeight: "600" },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  segment: { flexDirection: "row", backgroundColor: colors.bg, borderRadius: 10, padding: 3 },
  segItem: { flex: 1, paddingVertical: 9, alignItems: "center", borderRadius: 8 },
  segActive: { backgroundColor: colors.primary },
  segText: { fontWeight: "600", color: colors.text },
});
