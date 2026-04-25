import { useEffect, useRef, useState } from "react";

// Browser MediaRecorder wrapper. start() requests mic access and begins
// recording; stop() ends recording and resolves with a Blob (typically
// audio/webm;codecs=opus on Chromium / Firefox, audio/mp4 on Safari).
//
// Caller is responsible for sending the blob to the /transcribe endpoint.
export function useVoiceRecorder() {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState(null);
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const tickRef = useRef(null);

  useEffect(() => {
    if (recording) {
      tickRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } else {
      clearInterval(tickRef.current);
      setSeconds(0);
    }
    return () => clearInterval(tickRef.current);
  }, [recording]);

  const supported =
    typeof window !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== "undefined";

  const start = async () => {
    if (!supported) {
      setError("voice not supported in this browser");
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported?.("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported?.("audio/webm")
        ? "audio/webm"
        : MediaRecorder.isTypeSupported?.("audio/mp4")
        ? "audio/mp4"
        : "";
      const mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.start();
      mediaRef.current = mr;
      setRecording(true);
      setError(null);
      return true;
    } catch (err) {
      setError(err.message || "microphone unavailable");
      return false;
    }
  };

  const stop = () =>
    new Promise((resolve) => {
      const mr = mediaRef.current;
      if (!mr || mr.state === "inactive") {
        setRecording(false);
        return resolve(null);
      }
      mr.onstop = () => {
        mr.stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        chunksRef.current = [];
        mediaRef.current = null;
        setRecording(false);
        resolve(blob.size > 0 ? blob : null);
      };
      mr.stop();
    });

  return { recording, seconds, error, supported, start, stop };
}
