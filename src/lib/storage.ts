import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import type { Topic } from "./topics";
import type { Review } from "./claude";

export type Level = "beginner" | "intermediate" | "advanced";

export type Settings = {
  level: Level;
  autoSpeak: boolean;
  speechRate: number;
};

export type Line = { role: "user" | "assistant"; text: string };

export type Session = {
  id: string;
  date: string; // 로컬 날짜 YYYY-MM-DD
  startedAt: number;
  durationSec: number;
  topic: Topic;
  transcript: Line[];
  review?: Review;
};

const SESSIONS_KEY = "daily-talk/sessions";
const SETTINGS_KEY = "daily-talk/settings";
const API_KEY_KEY = "anthropic_api_key";

export const DEFAULT_SETTINGS: Settings = {
  level: "intermediate",
  autoSpeak: true,
  speechRate: 0.95,
};

export function localDate(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ---- API key (기기 보안 저장소) ----
export async function getApiKey(): Promise<string | null> {
  return SecureStore.getItemAsync(API_KEY_KEY);
}

export async function setApiKey(key: string): Promise<void> {
  if (key.trim()) await SecureStore.setItemAsync(API_KEY_KEY, key.trim());
  else await SecureStore.deleteItemAsync(API_KEY_KEY);
}

// ---- Settings ----
export async function getSettings(): Promise<Settings> {
  const raw = await AsyncStorage.getItem(SETTINGS_KEY);
  return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
}

export async function saveSettings(s: Settings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

// ---- Sessions (최신순) ----
export async function getSessions(): Promise<Session[]> {
  const raw = await AsyncStorage.getItem(SESSIONS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function getSession(id: string): Promise<Session | undefined> {
  return (await getSessions()).find((s) => s.id === id);
}

export async function saveSession(session: Session): Promise<void> {
  const sessions = await getSessions();
  const idx = sessions.findIndex((s) => s.id === session.id);
  if (idx >= 0) sessions[idx] = session;
  else sessions.unshift(session);
  await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

export async function deleteSession(id: string): Promise<void> {
  const sessions = (await getSessions()).filter((s) => s.id !== id);
  await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

// 오늘(또는 오늘 아직 안 했으면 어제)부터 거꾸로 연속 학습일 계산
export function computeStreak(sessions: Session[]): number {
  const days = new Set(sessions.map((s) => s.date));
  const cursor = new Date();
  if (!days.has(localDate(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(localDate(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
