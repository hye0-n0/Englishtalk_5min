import { useEffect, useRef, useState } from "react";
import type { ExpoSpeechRecognitionModuleType } from "expo-speech-recognition/build/ExpoSpeechRecognitionModule.types";

// expo-speech-recognition은 네이티브 모듈이라 Expo Go에는 없다.
// 개발 빌드에서는 음성 인식을 쓰고, Expo Go에서는 텍스트 입력만 쓰도록 안전하게 불러온다.
let Recognizer: ExpoSpeechRecognitionModuleType | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Recognizer = require("expo-speech-recognition").ExpoSpeechRecognitionModule;
} catch {
  Recognizer = null;
}

export const speechRecognitionSupported = Recognizer !== null;

export function useSpeechInput(onFinal: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [partial, setPartial] = useState("");
  const [error, setError] = useState<string | null>(null);
  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;

  useEffect(() => {
    if (!Recognizer) return;
    const subs = [
      Recognizer.addListener("start", () => {
        setListening(true);
        setError(null);
      }),
      Recognizer.addListener("end", () => {
        setListening(false);
        setPartial("");
      }),
      Recognizer.addListener("result", (e) => {
        const text = e.results[0]?.transcript ?? "";
        if (e.isFinal) {
          setPartial("");
          if (text.trim()) onFinalRef.current(text.trim());
        } else {
          setPartial(text);
        }
      }),
      Recognizer.addListener("error", (e) => {
        setListening(false);
        if (e.error !== "no-speech" && e.error !== "aborted") {
          setError(`음성 인식 오류: ${e.message}`);
        }
      }),
    ];
    return () => subs.forEach((s) => s.remove());
  }, []);

  async function start() {
    if (!Recognizer) return;
    const perm = await Recognizer.requestPermissionsAsync();
    if (!perm.granted) {
      setError("마이크/음성 인식 권한이 필요해요. 설정 앱에서 허용해 주세요.");
      return;
    }
    Recognizer.start({
      lang: "en-US",
      interimResults: true,
      continuous: false,
      addsPunctuation: true,
    });
  }

  function stop() {
    Recognizer?.stop();
  }

  return { listening, partial, error, start, stop };
}
