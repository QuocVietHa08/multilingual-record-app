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
  Alert,
  ScrollView,
  Dimensions,
} from "react-native";
import { Audio } from "expo-av";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

interface Styles {
  container: ViewStyle;
  content: ViewStyle;
  title: TextStyle;
  recordButton: ViewStyle;
  recording: ViewStyle;
  instructions: TextStyle;
  topBar: ViewStyle;
  progressBar: ViewStyle;
  progressIndicator: ViewStyle;
  timeText: TextStyle;
  timeContainer: ViewStyle;
  translationContainer: ViewStyle;
  translationItem: ViewStyle;
  translationText: TextStyle;
  translationTimestamp: TextStyle;
  controlsContainer: ViewStyle;
  controlButton: ViewStyle;
  activeTranslation: ViewStyle;
  goToMainButton: ViewStyle;
  goToMainText: TextStyle;
}

const { width } = Dimensions.get("window");

// Types for our data
interface Translation {
  text: string;
  timestamp: number; // in seconds
  language: string;
}

interface RecordingData {
  uri: string;
  duration: number; // in seconds
  translations: Translation[];
}

// Mock data for testing - remove in production
const mockRecording: RecordingData = {
  uri: "file://example.m4a",
  duration: 60, // 60 seconds
  translations: [
    {
      text: "[00:00] Hello, this lecture is about 日本語の勉強.",
      timestamp: 0,
      language: "en-ja",
    },
    {
      text: "[00:05] Today, we'll explore 文化の違い.",
      timestamp: 5,
      language: "en-ja",
    },
    {
      text: "[00:10] In Hindi, we say भारतीय भाषा कैसे बोलें.",
      timestamp: 10,
      language: "hi",
    },
    {
      text: "[00:15] Let's also learn 敬語 and cultural nuances for better communication.",
      timestamp: 15,
      language: "en-ja",
    },
    {
      text: "[00:20] For example, in Hindi, भारतीय is similar to 日本人 in Japanese.",
      timestamp: 20,
      language: "en-ja-hi",
    },
    {
      text: "[00:25] Ready? 始めましょう! 🍜",
      timestamp: 25,
      language: "en-ja",
    },
    {
      text: "[00:00] Hello, this lecture is about 日本語の勉強.",
      timestamp: 0,
      language: "en-ja",
    },
    {
      text: "[00:05] Today, we'll explore 文化の違い.",
      timestamp: 5,
      language: "en-ja",
    },
    {
      text: "[00:10] In Hindi, we say भारतीय भाषा कैसे बोलें.",
      timestamp: 10,
      language: "hi",
    },
    {
      text: "[00:15] Let's also learn 敬語 and cultural nuances for better communication.",
      timestamp: 15,
      language: "en-ja",
    },
    {
      text: "[00:20] For example, in Hindi, भारतीय is similar to 日本人 in Japanese.",
      timestamp: 20,
      language: "en-ja-hi",
    },
    {
      text: "[00:25] Ready? 始めましょう! 🍜",
      timestamp: 25,
      language: "en-ja",
    },
    {
      text: "[00:00] Hello, this lecture is about 日本語の勉強.",
      timestamp: 0,
      language: "en-ja",
    },
    {
      text: "[00:05] Today, we'll explore 文化の違い.",
      timestamp: 5,
      language: "en-ja",
    },
    {
      text: "[00:10] In Hindi, we say भारतीय भाषा कैसे बोलें.",
      timestamp: 10,
      language: "hi",
    },
    {
      text: "[00:15] Let's also learn 敬語 and cultural nuances for better communication.",
      timestamp: 15,
      language: "en-ja",
    },
    {
      text: "[00:20] For example, in Hindi, भारतीय is similar to 日本人 in Japanese.",
      timestamp: 20,
      language: "en-ja-hi",
    },
    {
      text: "[00:25] Ready? 始めましょう! 🍜",
      timestamp: 25,
      language: "en-ja",
    },
    {
      text: "[00:00] Hello, this lecture is about 日本語の勉強.",
      timestamp: 0,
      language: "en-ja",
    },
    {
      text: "[00:05] Today, we'll explore 文化の違い.",
      timestamp: 5,
      language: "en-ja",
    },
    {
      text: "[00:10] In Hindi, we say भारतीय भाषा कैसे बोलें.",
      timestamp: 10,
      language: "hi",
    },
    {
      text: "[00:15] Let's also learn 敬語 and cultural nuances for better communication.",
      timestamp: 15,
      language: "en-ja",
    },
    {
      text: "[00:20] For example, in Hindi, भारतीय is similar to 日本人 in Japanese.",
      timestamp: 20,
      language: "en-ja-hi",
    },
    {
      text: "[00:25] Ready? 始めましょう! 🍜",
      timestamp: 25,
      language: "en-ja",
    },
  ],
};

export default function Index() {
  const router = useRouter();
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  // In a real app, you would get this from the store
  const [recording, setRecording] = useState<RecordingData | null>(
    mockRecording
  );

  const progressAnimation = useSharedValue(0);

  useEffect(() => {
    // Load the recording when component mounts
    if (recording) {
      loadSound(recording.uri);
      setDuration(recording.duration);
    }

    return () => {
      // Cleanup when component unmounts
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [recording]);

  useEffect(() => {
    // Update progress bar and scroll to current translation
    if (isPlaying) {
      const interval = setInterval(() => {
        if (sound) {
          sound.getStatusAsync().then((status) => {
            if (status.isLoaded) {
              const position = status.positionMillis / 1000; // Convert to seconds
              setCurrentPosition(position);
              progressAnimation.value = position / duration;

              // Find the current translation to scroll to
              const currentTranslationIndex =
                recording?.translations.findIndex((t, i, arr) => {
                  if (i === arr.length - 1) return position <= t.timestamp;
                  return (
                    position >= t.timestamp && position < arr[i + 1].timestamp
                  );
                }) || 0;

              if (currentTranslationIndex >= 0 && scrollViewRef.current) {
                scrollViewRef.current.scrollTo({
                  y: currentTranslationIndex * 70, // Approximate height of each translation item
                  animated: true,
                });
              }
            }
          });
        }
      }, 100);

      return () => clearInterval(interval);
    }
  }, [isPlaying, sound, duration]);

  const loadSound = async (uri: string) => {
    try {
      const { sound } = await Audio.Sound.createAsync({ uri });
      setSound(sound);
    } catch (error) {
      console.error("Error loading sound", error);
      // Alert.alert('Error', 'Failed to load recording');
    }
  };

  const playSound = async () => {
    if (sound) {
      await sound.playAsync();
      setIsPlaying(true);
    }
  };

  const pauseSound = async () => {
    if (sound) {
      await sound.pauseAsync();
      setIsPlaying(false);
    }
  };

  const seekSound = async (position: number) => {
    if (sound) {
      await sound.setPositionAsync(position * 1000); // Convert to milliseconds
      setCurrentPosition(position);
    }
  };

  const handleProgressBarPress = (event: any) => {
    const { locationX } = event.nativeEvent;
    const position = (locationX / width) * duration;
    progressAnimation.value = position / duration;
    seekSound(position);
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes < 10 ? "0" : ""}${minutes}:${
      remainingSeconds < 10 ? "0" : ""
    }${remainingSeconds}`;
  };

  const progressStyle = useAnimatedStyle(() => {
    return {
      width: `${progressAnimation.value * 100}%`,
    };
  });

  const isTranslationActive = (
    timestamp: number,
    index: number,
    translations: Translation[]
  ) => {
    if (index === translations.length - 1) {
      return currentPosition >= timestamp;
    }
    return (
      currentPosition >= timestamp &&
      currentPosition < translations[index + 1].timestamp
    );
  };

  const goToMain = () => {
    router.back();
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.topBar}>
        <View style={styles.timeContainer}>
          <Text style={styles.timeText}>{formatTime(currentPosition)}</Text>
          <View style={styles.progressBar}>
            <Animated.View style={[styles.progressIndicator, progressStyle]} />
          </View>
          <Text style={styles.timeText}>{formatTime(duration)}</Text>
        </View>
      </View>

        {/* Translation List */}
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={{ paddingBottom: 20, marginTop: 10 }}
        >
          {recording?.translations.map((translation, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.translationItem,
                isTranslationActive(
                  translation.timestamp,
                  index,
                  recording.translations
                ) && styles.activeTranslation,
              ]}
              onPress={() => seekSound(translation.timestamp)}
            >
              <Text style={styles.translationText}>{translation.text}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      <TouchableOpacity style={styles.goToMainButton} onPress={goToMain}>
        <Text style={styles.goToMainText}>Go to main</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create<Styles>({
  container: {
    flex: 1,
    paddingTop: 50,
    paddingBottom: 40,
  },
  content: {
    flex: 1,
    padding: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 40,
  },
  recordButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 20,
  },
  recording: {
    backgroundColor: "#FF3B30",
  },
  instructions: {
    fontSize: 16,
    color: "#666",
  },
  topBar: {
    height: 60,
    padding: 10,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    justifyContent: "center",
  },
  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: "#e0e0e0",
    borderRadius: 2,
    marginHorizontal: 10,
    overflow: "hidden",
  },
  progressIndicator: {
    height: "100%",
    backgroundColor: "#007AFF",
    borderRadius: 2,
  },
  timeText: {
    fontSize: 12,
    color: "#666",
    width: 40,
  },
  translationContainer: {
    flex: 1,
  },
  translationItem: {
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    backgroundColor: "#f9f9f9",
  },
  activeTranslation: {
    backgroundColor: "#f0f8ff",
    borderWidth: 1,
    borderColor: "#007AFF",
  },
  translationText: {
    fontSize: 14,
    lineHeight: 20,
  },
  translationTimestamp: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  controlsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  controlButton: {
    padding: 10,
  },
  goToMainButton: {
    marginTop: 0,
    padding: 12,
    backgroundColor: "#f0f0f0",
    marginHorizontal: 20,
    alignItems: "center",
    borderRadius: 8,
  },
  goToMainText: {
    fontSize: 14,
    color: "#007AFF",
  },
});
