"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AuthenticatedLayout from "../components/AuthenticatedLayout";
import { encodeWAV } from "@/app/utils/wavEncoder";

interface TranscriptionSegment {
  start_time: string;
  end_time: string;
  text: string;
  speaker?: string;
  confidence: number;
}

interface Transcript {
  full_transcript: string;
  segments: TranscriptionSegment[];
  total_duration: number;
  segments_count: number;
}

interface TranscriptionData {
  transcript: Transcript;
  metadata: {
    original_filename: string;
  }
}

interface TranscriptionHistory {
  transcription_id: string;
  original_filename: string;
  created_at: string;
  status: string;
  audio_duration?: number;
  user_name: string;
  user_email: string;
}

const API_URL = "https://n8yh3flwsc.execute-api.us-east-1.amazonaws.com/prod/api";

export default function ScribePage() {
  // State for audio recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioSize, setAudioSize] = useState<number>(0);
  
  // State for transcription
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionProgress, setTranscriptionProgress] = useState(0);
  const [transcriptionStatus, setTranscriptionStatus] = useState("");
  const [transcriptionId, setTranscriptionId] = useState<string | null>(null);
  const [transcription, setTranscription] = useState<TranscriptionData | null>(null);
  
  // State for transcript history
  const [transcriptHistory, setTranscriptHistory] = useState<TranscriptionHistory[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [activeTab, setActiveTab] = useState("record");
  
  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Get auth token
  const getAuthToken = () => {
    // In client component, we need to get the token from localStorage or similar
    // For API requests from the browser
    return localStorage.getItem('auth_token') || '';
  };

  // Handle recording
  const startRecording = async () => {
    try {
      console.log("[DEBUG] Requesting microphone access...");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        chunksRef.current.push(event.data);
        console.log("[DEBUG] Data available from MediaRecorder:", event.data);
      };
      
      mediaRecorder.onstop = () => {
        // Convert chunks to Float32Array if needed (browser-specific)
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        // Decode audio and re-encode as WAV for maximum compatibility
        const fileReader = new FileReader();
        fileReader.onloadend = async () => {
          const arrayBuffer = fileReader.result as ArrayBuffer;
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
          const float32Array = audioBuffer.getChannelData(0);
          // Use your cross-browser WAV encoder
          const wavBlob = encodeWAV(float32Array, audioCtx.sampleRate);
          setAudioBlob(wavBlob);
          setAudioUrl(URL.createObjectURL(wavBlob));
          setAudioSize(wavBlob.size);
          // Clean up stream
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
          }
        };
        fileReader.readAsArrayBuffer(audioBlob);
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      console.log("[DEBUG] Started recording.");
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("Failed to access microphone. Please ensure you have granted permission.");
    }
  };
  
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };
  
  // Patient info for upload
  const [patName, setPatName] = useState("");
  const [patNum, setPatNum] = useState("");

  const startTranscription = async () => {
    if (!audioBlob) {
      alert("Please record audio first");
      return;
    }
    if (!patName.trim() || !patNum.trim()) {
      alert("Please enter both patient name and number.");
      return;
    }

    try {
      console.log("[DEBUG] Starting transcription process...");
      setIsTranscribing(true);
      setTranscriptionProgress(0);
      setTranscriptionStatus("Getting upload URL...");

      // Generate filename based on patient name, number and current date/time
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
      const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
      const sanitizedPatName = patName.trim().replace(/[^a-zA-Z0-9]/g, '_');
      const sanitizedPatNum = patNum.trim().replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `${sanitizedPatName}_${sanitizedPatNum}_${dateStr}_${timeStr}.wav`;
      
      const token = getAuthToken();

      console.log("[DEBUG] Transcription parameters:", { 
        filename,
        patNum,
        patName,
        audioSize: audioBlob.size,
        audioType: audioBlob.type
      });

      const uploadUrlResponse = await fetch(`${API_URL}/get-upload-url`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ filename, patNum, patName })
      });

      console.log("[DEBUG] Upload URL response status:", uploadUrlResponse.status);

      if (!uploadUrlResponse.ok) {
        throw new Error("Failed to get upload URL");
      }

      const uploadData = await uploadUrlResponse.json();
      console.log("[DEBUG] Upload URL response data:", uploadData);
      setTranscriptionId(uploadData.transcription_id);
      setTranscriptionProgress(25);
      setTranscriptionStatus("Uploading audio file...");

      // Step 2: Upload audio to S3
      const uploadResponse = await fetch(uploadData.upload_url, {
        method: "PUT",
        body: audioBlob,
        headers: {
          "Content-Type": "audio/wav"
        }
      });

      console.log("[DEBUG] Audio upload response status:", uploadResponse.status);

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload audio file");
      }

      setTranscriptionProgress(50);
      setTranscriptionStatus("Audio uploaded! Starting transcription...");

      // Step 3: Poll for transcription status
      pollTranscriptionStatus(uploadData.transcription_id);

    } catch (error) {
      console.error("Transcription error:", error);
      alert(`Transcription failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      setIsTranscribing(false);
    }
  };
  
  const pollTranscriptionStatus = async (id: string) => {
    try {
      console.log("[DEBUG] Polling transcription status for ID:", id);
      const token = getAuthToken();
      const response = await fetch(`${API_URL}/status/${id}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error("Failed to get transcription status");
      }
      
      const data = await response.json();
      console.log("[DEBUG] Transcription status data:", data);
      
      const progress = data.progress || 0;
      setTranscriptionProgress(50 + (progress / 2)); // Map 0-100 to 50-100
      setTranscriptionStatus(`Status: ${data.status}`);
      
      if (data.status === "completed") {
        console.log("[DEBUG] Transcription completed, fetching transcript...");
        await getTranscript(id);
      } else if (data.status === "failed") {
        console.error("[DEBUG] Transcription failed:", data.error_message);
        throw new Error(data.error_message || "Transcription failed");
      } else {
        // Continue polling
        setTimeout(() => pollTranscriptionStatus(id), 3000);
      }
    } catch (error) {
      console.error("Polling error:", error);
      alert(`Transcription status check failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      setIsTranscribing(false);
    }
  };
  
  const getTranscript = async (id: string) => {
    try {
      console.log("[DEBUG] Fetching final transcript for ID:", id);
      setTranscriptionProgress(95);
      setTranscriptionStatus("Getting transcript results...");
      
      const token = getAuthToken();
      const response = await fetch(`${API_URL}/transcript/${id}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error("Failed to get transcript");
      }
      
      const data = await response.json();
      console.log("[DEBUG] Raw transcript response:", data);

      // Validate the data structure
      if (!data || typeof data !== 'object') {
        throw new Error("Invalid transcript data received");
      }

      // Initialize transcript structure if missing
      const transcript = {
        full_transcript: data.transcript?.full_transcript || data.full_transcript || "",
        segments: data.transcript?.segments || data.segments || [],
        segments_count: 0,
        total_duration: 0
      };

      // Calculate segments_count and total_duration
      transcript.segments_count = transcript.segments.length;
      transcript.total_duration = transcript.segments.reduce((total: number, segment: TranscriptionSegment) => {
        const endTime = parseFloat(segment.end_time || "0");
        return Math.max(total, endTime);
      }, 0);

      // Create normalized data structure
      const normalizedData = {
        transcript,
        metadata: data.metadata || {
          original_filename: data.original_filename || "recording.wav"
        }
      };

      console.log("[DEBUG] Normalized transcript data:", {
        transcriptionId: id,
        metadata: normalizedData.metadata,
        segmentsCount: transcript.segments_count,
        wordCount: transcript.full_transcript.split(' ').length,
        fullTranscript: transcript.full_transcript.substring(0, 100) + "..." // First 100 chars
      });
      
      setTranscription(normalizedData);
      setTranscriptionProgress(100);
      setTranscriptionStatus("Transcription completed!");
      
      setTimeout(() => {
        setIsTranscribing(false);
        // Reset form fields after successful transcription
        setPatName("");
        setPatNum("");
      }, 1000);
      
    } catch (error) {
      console.error("[DEBUG] Get transcript error:", error);
      console.error("[DEBUG] Error stack:", error instanceof Error ? error.stack : "No stack trace");
      alert(`Failed to get transcript: ${error instanceof Error ? error.message : "Unknown error"}`);
      setIsTranscribing(false);
    }
  };
  
  // Helper to decode JWT and get workspaceId
  const getWorkspaceId = () => {
    const token = getAuthToken();
    if (!token) return "";
    try {
      // JWT decode (naive, no validation)
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.workspaceId || "";
    } catch {
      return "";
    }
  };

  // Load transcript history
  const loadTranscriptHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const token = getAuthToken();
      const workspaceId = getWorkspaceId();
      if (!workspaceId) throw new Error("Could not determine workspaceId from token");
      const response = await fetch(`${API_URL}/workspace/${workspaceId}/transcripts`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error("Failed to load transcripts");
      }
      const data = await response.json();
      setTranscriptHistory(data.transcripts || []);
    } catch (error) {
      console.error("Load history error:", error);
      alert(`Failed to load transcript history: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsLoadingHistory(false);
    }
  };
  
  // View a specific transcript
  const viewTranscript = async (id: string) => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_URL}/transcript/${id}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error("Failed to load transcript");
      }
      
      const data = await response.json();
      setTranscription(data);
      setTranscriptionId(id);
      setActiveTab("record");
    } catch (error) {
      console.error("View transcript error:", error);
      alert(`Failed to load transcript: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };
  
  // Download transcript as PDF
 

  // Copy to clipboard
  const copyToClipboard = () => {
    if (!transcription) return;
    
    const text = transcription.transcript.full_transcript;
    navigator.clipboard.writeText(text)
      .then(() => {
        alert("Transcript copied to clipboard!");
      })
      .catch(err => {
        console.error("Failed to copy text: ", err);
        alert("Failed to copy transcript to clipboard");
      });
  };

  // Format time display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };
  
  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Reset form and recording
  const resetForm = () => {
    setPatName("");
    setPatNum("");
    setAudioBlob(null);
    setAudioUrl(null);
    setAudioSize(0);
    setRecordingTime(0);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // Load transcript history when the history tab is opened
  useEffect(() => {
    if (activeTab === "history") {
      loadTranscriptHistory();
    }
  }, [activeTab]);

  return (
    <AuthenticatedLayout>
      <div className="container mx-auto py-8 max-w-5xl">
        <h1 className="text-3xl font-bold mb-6">Voice Transcription</h1>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="record">Record & Transcribe</TabsTrigger>
            {/* <TabsTrigger value="history">Transcript History</TabsTrigger> */}
          </TabsList>
          <TabsContent value="record" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Record Audio</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-lg">
                  {/* Patient Info Fields */}
                  <div className="flex flex-col md:flex-row gap-4 w-full mb-6">
                    <input
                      type="text"
                      placeholder="Patient Name"
                      value={patName}
                      onChange={e => setPatName(e.target.value)}
                      className="border rounded px-3 py-2 flex-1"
                      disabled={isTranscribing || isRecording}
                    />
                    <input
                      type="text"
                      placeholder="Patient Number"
                      value={patNum}
                      onChange={e => setPatNum(e.target.value)}
                      className="border rounded px-3 py-2 flex-1"
                      disabled={isTranscribing || isRecording}
                    />
                  </div>
                  
                  {/* Filename Field - Removed */}
                  
                  {/* ...existing code for timer, controls, status, playback, button... */}
                  <div className="text-4xl font-bold mb-8 text-blue-600">
                    {formatTime(recordingTime)}
                  </div>
                  <div className="flex justify-center items-center gap-8 mb-6">
                    {!isRecording ? (
                      <Button 
                        variant="default"
                        size="lg"
                        onClick={startRecording}
                        disabled={isTranscribing}
                        className="rounded-full w-20 h-20 flex items-center justify-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
                          <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                          <line x1="12" x2="12" y1="19" y2="22"></line>
                        </svg>
                      </Button>
                    ) : (
                      <Button 
                        variant="destructive"
                        size="lg"
                        onClick={stopRecording}
                        className="rounded-full w-20 h-20 flex items-center justify-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect width="6" height="16" x="4" y="4" rx="1"></rect>
                          <rect width="6" height="16" x="14" y="4" rx="1"></rect>
                        </svg>
                      </Button>
                    )}
                  </div>
                  <div className="text-center mb-4">
                    <p className="text-lg font-medium mb-1">
                      {isRecording ? 'Recording in progress...' : 'Ready to record'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {isRecording 
                        ? 'Click stop when finished' 
                        : 'Click the microphone button to start'}
                    </p>
                    {audioBlob && !isRecording && (
                      <div className="mt-3 p-2 bg-blue-50 rounded-md text-sm">
                        <p className="font-medium">Recording saved</p>
                        <p>Size: {formatFileSize(audioSize)}</p>
                      </div>
                    )}
                  </div>
                  {audioUrl && !isRecording && (
                    <div className="w-full max-w-md mt-4">
                      <audio src={audioUrl} controls className="w-full" />
                    </div>
                  )}
                  {audioBlob && !isRecording && (
                    <div className="flex gap-3 mt-6">
                    <Button
                      variant="default"
                      size="lg"
                      onClick={startTranscription}
                      disabled={isTranscribing}
                        className=""
                    >
                      {isTranscribing ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Transcribing...
                        </>
                      ) : "Start Transcription"}
                    </Button>
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={resetForm}
                        disabled={isTranscribing}
                        className=""
                      >
                        Clear
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Transcription Progress */}
            {isTranscribing && (
              <Card>
                <CardHeader>
                  <CardTitle>Transcription Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
                    <div 
                      className="bg-blue-600 h-4 rounded-full transition-all duration-300"
                      style={{ width: `${transcriptionProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-center text-gray-600">{transcriptionStatus}</p>
                </CardContent>
              </Card>
            )}
            
            {/* Transcription Results */}
            {transcription && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Transcription Results</span>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex items-center gap-1" onClick={copyToClipboard}>
                        <span className="text-base">📋</span> Copy
                      </Button>
                      
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                   
                    <div className="bg-gray-100 p-4 rounded-lg text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {transcription.transcript.segments_count}
                      </div>
                      <div className="text-sm text-gray-600">Segments</div>
                    </div>
                    <div className="bg-gray-100 p-4 rounded-lg text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {Math.round(
                          transcription.transcript.segments.reduce(
                            (sum, segment) => sum + segment.confidence, 
                            0
                          ) / transcription.transcript.segments.length * 100
                        )}%
                      </div>
                      <div className="text-sm text-gray-600">Avg Confidence</div>
                    </div>
                    <div className="bg-gray-100 p-4 rounded-lg text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {transcription.transcript.full_transcript.split(' ').length}
                      </div>
                      <div className="text-sm text-gray-600">Words</div>
                    </div>
                  </div>
                  
                  {/* Full Transcript */}
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 border-b">
                      <h3 className="font-medium">Full Transcript</h3>
                    </div>
                    <div className="p-4 whitespace-pre-wrap">
                      {transcription.transcript.full_transcript}
                    </div>
                  </div>
                  
                  {/* Segments */}
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 border-b">
                      <h3 className="font-medium">Timestamped Segments</h3>
                    </div>
                    <div className="divide-y">
                      {transcription.transcript.segments.map((segment, index) => (
                        <div 
                          key={index} 
                          className="p-4 hover:bg-gray-50"
                        >
                          <div className="text-sm text-gray-600 mb-1">
                            {segment.start_time} - {segment.end_time}
                          </div>
                          {segment.speaker && (
                            <div className="font-medium text-blue-600 mb-1">
                              Speaker: {segment.speaker}
                            </div>
                          )}
                          <div>{segment.text}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="history">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Transcript History</CardTitle>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="ml-auto"
                  onClick={loadTranscriptHistory}
                  disabled={isLoadingHistory}
                >
                  {isLoadingHistory ? "Loading..." : "Refresh"}
                </Button>
              </CardHeader>
              <CardContent>
                {transcriptHistory.length > 0 ? (
                  <div className="space-y-4">
                    {transcriptHistory.map((item) => (
                      <div 
                        key={item.transcription_id}
                        className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium">{item.original_filename}</h3>
                            <div className="text-sm text-gray-600">
                              Created: {new Date(item.created_at).toLocaleString()}
                            </div>
                            <div className="text-sm text-gray-600">
                              Status: 
                              <span className={
                                item.status === "completed" ? "text-green-600" : 
                                item.status === "failed" ? "text-red-600" : 
                                "text-yellow-600"
                              }>
                                {" "}{item.status}
                              </span>
                              {item.audio_duration && ` | Duration: ${Math.round(item.audio_duration)}s`}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              User: {item.user_name} ({item.user_email})
                            </div>
                          </div>
                          <div>
                            {item.status === "completed" ? (
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="ml-2"
                                onClick={() => viewTranscript(item.transcription_id)}
                              >
                                👁️ View
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="ml-2"
                                onClick={() => pollTranscriptionStatus(item.transcription_id)}
                              >
                                🔄 Check
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                      <span className="text-3xl">🎙️</span>
                    </div>
                    <h3 className="font-medium text-lg mb-1">No transcripts found</h3>
                    <p className="text-gray-500">
                      {isLoadingHistory ? 
                        "Loading transcript history..." : 
                        "Record audio and transcribe it to get started!"}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AuthenticatedLayout>
  );
}