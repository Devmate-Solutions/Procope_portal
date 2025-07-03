// New version of audio recording using Web Audio API and 16-bit WAV encoding

"use client";

import React, { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { encodeWAV } from "../utils/wavEncoder";

export default function Recorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioDataRef = useRef<Float32Array[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const audioContext = new AudioContext({ sampleRate: 44100 });
    const source = audioContext.createMediaStreamSource(stream);
    const processor = audioContext.createScriptProcessor(4096, 1, 1);

    audioContextRef.current = audioContext;
    sourceRef.current = source;
    processorRef.current = processor;

    audioDataRef.current = [];

    processor.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0);
      audioDataRef.current.push(new Float32Array(input));
    };

    source.connect(processor);
    processor.connect(audioContext.destination);

    setIsRecording(true);
    setRecordingTime(0);

    timerRef.current = setInterval(() => {
      setRecordingTime((prev) => prev + 1);
    }, 1000);
  };

  const stopRecording = () => {
    if (!audioContextRef.current) return;

    processorRef.current?.disconnect();
    sourceRef.current?.disconnect();
    audioContextRef.current.close();

    if (timerRef.current) clearInterval(timerRef.current);

    const audioBuffer = mergeBuffers(audioDataRef.current);
    const wavBlob = encodeWAV(audioBuffer, 44100);
    setAudioBlob(wavBlob);
    setAudioUrl(URL.createObjectURL(wavBlob));

    setIsRecording(false);
  };

  const mergeBuffers = (chunks: Float32Array[]) => {
    const length = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Float32Array(length);
    let offset = 0;
    chunks.forEach(chunk => {
      result.set(chunk, offset);
      offset += chunk.length;
    });
    return result;
  };

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [audioUrl]);

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Mic Recorder (Cross-Platform WAV)</h1>

      <div className="text-xl">{recordingTime}s</div>

      <div className="flex gap-4">
        {!isRecording ? (
          <Button onClick={startRecording} className={undefined} variant={undefined} size={undefined}>Start Recording</Button>
        ) : (
          <Button onClick={stopRecording} variant="destructive" className={undefined} size={undefined}>Stop Recording</Button>
        )}
      </div>

      {audioUrl && (
        <div>
          <audio src={audioUrl} controls className="mt-4 w-full" />
        </div>
      )}
    </div>
  );
}