"use client";

import { useCallback, useEffect, useRef, useState } from "react";

function getRecognitionCtor():
  | SpeechRecognitionConstructor
  | null {
  if (typeof window === "undefined") return null;
  return (
    window.SpeechRecognition || window.webkitSpeechRecognition || null
  );
}

export function useVoiceDictation() {
  const [isListening, setIsListening] = useState(false);
  const [supported] = useState(() => getRecognitionCtor() !== null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const baseTextRef = useRef("");
  const finalRef = useRef("");

  const stop = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch {
      // already stopped
    }
    setIsListening(false);
    setMediaStream((stream) => {
      stream?.getTracks().forEach((t) => t.stop());
      return null;
    });
  }, []);

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.stop();
      } catch {
        // noop
      }
      setMediaStream((stream) => {
        stream?.getTracks().forEach((t) => t.stop());
        return null;
      });
    };
  }, []);

  const toggle = useCallback(
    (
      currentText: string,
      onTranscript: (next: string) => void,
    ): boolean => {
      const Ctor = getRecognitionCtor();
      if (!Ctor) return false;

      if (isListening) {
        stop();
        return false;
      }

      const recognition = new Ctor();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";
      baseTextRef.current = currentText ? `${currentText} ` : "";
      finalRef.current = "";

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let chunk = "";
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          if (event.results[i].isFinal) {
            chunk += `${event.results[i][0].transcript} `;
          }
        }
        if (chunk) {
          finalRef.current += chunk;
          onTranscript(`${baseTextRef.current}${finalRef.current}`.trimStart());
        }
      };
      recognition.onerror = () => stop();
      recognition.onend = () => setIsListening(false);

      recognitionRef.current = recognition;
      try {
        recognition.start();
      } catch {
        return false;
      }
      setIsListening(true);

      if (navigator.mediaDevices?.getUserMedia) {
        navigator.mediaDevices
          .getUserMedia({ audio: true })
          .then((stream) => setMediaStream(stream))
          .catch(() => {});
      }
      return true;
    },
    [isListening, stop],
  );

  return { isListening, supported, mediaStream, toggle, stop };
}
