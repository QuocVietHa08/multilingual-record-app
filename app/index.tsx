import { useRouter } from "expo-router";
import { useEffect, useState, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ViewStyle,
  TextStyle,
  Platform,
} from "react-native";
import { useAppStore, RecordingSegment } from "@/src/store/appStore";
import { Audio } from "expo-av";
import { getOpenAIService } from "@/src/services/openaiService";
import * as FileSystem from "expo-file-system";
import uuid from "react-native-uuid";
import Constants from 'expo-constants';

const OPENAI_API_KEY = Constants.expoConfig?.extra?.openaiApiKey;
interface Styles {
  container: ViewStyle;
  content: ViewStyle;
  title: TextStyle;
  recordButton: ViewStyle;
  recording: ViewStyle;
  instructions: ViewStyle;
  instructionText: TextStyle;
  segmentList: ViewStyle;
  segmentItem: ViewStyle;
  segmentText: TextStyle;
  transcriptionText: TextStyle;
  translationContainer: ViewStyle;
  translationText: TextStyle;
  timerText: TextStyle;
}

export default function Index() {
  const router = useRouter();
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [permissionResponse, requestPermission] = Audio.usePermissions();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const [recordingUris, setRecordingUris] = useState<string[]>([]);
  const [stringTranslate, setStringTranslate] = useState("");
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Get recording state from store
  const isRecording = useAppStore((state) => state.isRecording);
  const recordingSegments = useAppStore((state) => state.recordingSegments);
  const addRecordingSegment = useAppStore(
    (state) => (state as any).addRecordingSegment
  );
  const clearRecordingSegments = useAppStore(
    (state) => (state as any).clearRecordingSegments
  );
  const setIsRecordingState = useAppStore(
    (state) => (state as any).setIsRecording
  );
  const updateSegmentTranscription = useAppStore(
    (state) => (state as any).updateSegmentTranscription
  );

  // Transcribe audio using OpenAI
  const transcribeAudio = async (uri: string, segmentId: string) => {
    if (!OPENAI_API_KEY) {
      console.log("API Key Required");
      return;
    }

    try {
      console.log(
        `Starting transcription for segment ${segmentId} with URI: ${uri}`
      );

      // Get file info to verify it exists and check size
      const fileInfo = await FileSystem.getInfoAsync(uri);

      if (!fileInfo.exists) {
        throw new Error(`File does not exist at path: ${uri}`);
      }

      const openAIService = getOpenAIService(OPENAI_API_KEY);
      console.log("OpenAI service initialized, starting transcription");

      const transcription = await openAIService.transcribeAudio(uri);

      console.log(
        `Transcription result for segment ${segmentId}:`,
        transcription
      );
      setStringTranslate((prev) => prev + " " + transcription);
      updateSegmentTranscription(segmentId, transcription);
    } catch (error) {
      console.log("Transcription error details:", error);
    }
  };

  // Create a new recording
  const createNewRecording = async (): Promise<Audio.Recording | null> => {
    try {
      console.log("Creating new recording...");
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      console.log("New recording created");
      return recording;
    } catch (error) {
      console.error("Error creating new recording:", error);
      return null;
    }
  };

  // Stop current recording and save it
  const stopAndSaveRecording = async (
    recording: Audio.Recording
  ): Promise<string | null> => {
    try {
      console.log("Stopping current recording...");
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      console.log("Recording stopped, URI:", uri);
      return uri;
    } catch (error) {
      console.error("Error stopping recording:", error);
      return null;
    }
  };

  // Start recording
  const startRecording = async () => {
    try {
      // Request permissions if not granted
      if (permissionResponse && permissionResponse.status !== "granted") {
        console.log("Requesting permission..");
        await requestPermission();
      }

      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      console.log("Starting recording process...");
      setIsRecordingState(true);
      clearRecordingSegments();
      setStringTranslate("");
      setCurrentSegmentIndex(null);
      setRecordingTime(0);

      // Start timer to track recording duration
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      // Start the first recording
      const newRecording = await createNewRecording();
      if (!newRecording) {
        throw new Error("Failed to create initial recording");
      }

      setRecording(newRecording);
      recordingRef.current = newRecording;

      // Set up interval to create new recordings every 3 seconds
      intervalRef.current = setInterval(async () => {
        try {
          // Stop the current recording
          if (recordingRef.current) {
            const uri = await stopAndSaveRecording(recordingRef.current);

            if (uri) {
              // const segmentIndex = currentSegmentIndex;
              const segmentId = uuid.v4() as string;

              // Add to our segments
              const newSegment: RecordingSegment = {
                transcription: "",
                uri,
                id: segmentId,
                timestamp: Date.now(),
              };

              console.log(`Segment ${segmentId} saved with URI:`, uri);
              addRecordingSegment(newSegment);
              setRecordingUris((prev) => [...prev, uri]);

              // Start transcription in the background
              transcribeAudio(uri, segmentId).catch((e) =>
                console.error(`Error transcribing segment ${segmentId}:`, e)
              );
            }

            // Start a new recording immediately
            const newRecording = await createNewRecording();
            if (newRecording) {
              setRecording(newRecording);
              recordingRef.current = newRecording;
            } else {
              console.error("Failed to create new recording, stopping process");
              clearInterval(intervalRef.current!);
              setIsRecordingState(false);
            }
          }
        } catch (error) {
          console.error("Error in recording interval:", error);
        }
      }, 2100);

      return true;
    } catch (err) {
      console.log("Error starting recording:", err);
      console.error("Failed to start recording", err);
      return false;
    }
  };

  // Stop recording
  const stopRecording = async () => {
    console.log("Stopping recording process...");

    try {
      // Clear the interval
      if (intervalRef.current) {
        console.log("Clearing interval");
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      // Stop the current recording
      if (recordingRef.current) {
        console.log("Stopping final recording");
        const uri = await stopAndSaveRecording(recordingRef.current);

        if (uri) {
          const segmentId = uuid.v4() as string;

          // Add the final segment
          const newSegment: RecordingSegment = {
            id: segmentId,
            transcription: "",
            uri,
            timestamp: Date.now(),
          };

          console.log(`Final segment ${segmentId} saved with URI:`, uri);
          addRecordingSegment(newSegment);
          setRecordingUris((prev) => [...prev, uri]);

          // Transcribe the final segment
          transcribeAudio(uri, segmentId).catch((e) =>
            console.error(`Error transcribing final segment ${segmentId}:`, e)
          );
        }

        recordingRef.current = null;
      }

      // Reset audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: false,
      });

      setRecording(null);
      setIsRecordingState(false);
      router.push("/record");

      // Stop the timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    } catch (error) {
      console.error("Error stopping recording:", error);
    }
  };

  // Format time function for displaying recording duration
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes < 10 ? "0" : ""}${minutes}:${
      remainingSeconds < 10 ? "0" : ""
    }${remainingSeconds}`;
  };

  // Handle record button press
  const handleRecord = () => {
    // router.push('/record')
    // return;
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync();
        recordingRef.current = null;
      }

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  console.log("recordingSegments:", recordingSegments);

  return (
    <View style={styles.container}>
      <Text
        style={[styles.timerText, { color: isRecording ? "#FF3B30" : "#333" }]}
      >
        {formatTime(recordingTime)}
      </Text>
      <View style={styles.content}>
        {isRecording ? (
          <View style={styles.translationContainer}>
            <Text style={styles.translationText}>
              {!stringTranslate
                ? "Recording and transcribing..."
                : stringTranslate}
            </Text>
          </View>
        ) : (
          <View style={styles.instructions}>
              {/* <Text style={styles.instructionText}>Tap to record</Text> */}
          </View>
        )}
      </View>
      <View style={styles.content}>
        <TouchableOpacity
          style={[styles.recordButton, isRecording && styles.recording]}
          onPress={handleRecord}
        >
          <Ionicons
            name={isRecording ? "stop" : "mic"}
            size={40}
            color="white"
          />
        </TouchableOpacity>
        <Text style={styles.instructions}>
          {isRecording ? "Tap to stop recording" : "Tap to start recording"}
        </Text>
        {/* <Text style={styles.title}>
          Recording Segments: {recordingSegments.length}
        </Text> */}
      </View>
    </View>
  );
}

const styles = StyleSheet.create<Styles>({
  container: {
    flex: 1,
    paddingTop: 50,
    backgroundColor: "#fff",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    marginTop: 20,
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  recording: {
    backgroundColor: "#FF3B30",
  },
  instructions: {
    marginBottom: 20,
  },
  instructionText: {
    fontSize: 30,
  },
  segmentList: {
    width: "100%",
    maxHeight: 300,
    marginTop: 20,
  },
  segmentItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  segmentText: {
    fontSize: 14,
  },
  transcriptionText: {
    fontSize: 14,
    fontStyle: "italic",
    color: "#555",
    marginTop: 5,
  },
  translationContainer: {
    width: "100%",
    padding: 15,
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    marginVertical: 20,
    minHeight: 100,
    maxHeight: 500,
  },
  translationText: {
    fontSize: 16,
    color: "#333",
    lineHeight: 24,
  },
  timerText: {
    fontSize: 56,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 40,
    marginBottom: 20,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
});
