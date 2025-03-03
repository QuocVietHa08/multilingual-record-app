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
  ActivityIndicator,
} from "react-native";
import { Audio } from "expo-av";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { appStore, useAppStore } from "../src/store/appStore";
import PlayBackBar from "../src/components/record/PlayBackBar";

const { width } = Dimensions.get("window");

interface Styles {
  container: ViewStyle;
  content: ViewStyle;
  segmentItem: ViewStyle;
  activeSegment: ViewStyle;
  segmentHeader: ViewStyle;
  timestampText: TextStyle;
  transcriptionText: TextStyle;
  goToMainButton: ViewStyle;
  goToMainText: TextStyle;
}

export default function Index() {
  const router = useRouter();
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const positionUpdateInterval = useRef<NodeJS.Timeout | null>(null);
  const soundsRef = useRef<{ [key: string]: Audio.Sound }>({});
  const clearRecordingSegments = useAppStore(
    (state) => (state as any).clearRecordingSegments
  );

  // Get recording segments from app store
  const recordingSegments = useAppStore((state) => state.recordingSegments);

  const progressAnimation = useSharedValue(0);
  // console.log('progressAnimation', activeSegmentIndex, currentPosition)

  // Preload all audio files
  useEffect(() => {
    const preloadSounds = async () => {
      if (recordingSegments.length === 0) return;

      setIsLoading(true);
      console.log("Starting to preload all sounds...");

      try {
        // Clean up previous sounds
        for (const key in soundsRef.current) {
          await soundsRef.current[key].unloadAsync();
        }
        soundsRef.current = {};

        if (sound) {
          await sound.unloadAsync();
          setSound(null);
        }

        // Calculate total duration
        const estimatedDuration = recordingSegments.length * 2;
        setTotalDuration(estimatedDuration);

        // Preload all sounds
        for (let i = 0; i < recordingSegments.length; i++) {
          const segment = recordingSegments[i];
          // console.log(`Preloading sound ${i + 1}/${recordingSegments.length}: ${segment.uri}`);
          // console.log('i---->', i)
          try {
            const { sound: newSound } = await Audio.Sound.createAsync(
              { uri: segment.uri },
              { shouldPlay: false },
              (status) => {
                // console.log(`Sound ${i} status update:`, status);
              }
            );

            // console.log('chekcing--->', i)

            // Wait for sound to be loaded
            await new Promise<void>((resolve) => {
              console.log("waiting for the sound to be loaded");
              const checkLoaded = async () => {
                const status = await newSound.getStatusAsync();
                if (status.isLoaded) {
                  resolve();
                  console.log(
                    "the sound is loaded, play the next sound please"
                  );
                } else {
                  setTimeout(checkLoaded, 100);
                }
              };
              checkLoaded();
            });
            console.log("go thought the loading sound step");

            soundsRef.current[segment.id] = newSound;
          } catch (error) {
            console.log("error log--->", error);
            console.error(`Error preloading sound ${i}:`, error);
          }
        }

        // Set the first sound as the active one
        if (
          recordingSegments.length > 0 &&
          soundsRef.current[recordingSegments[0].id]
        ) {
          setSound(soundsRef.current[recordingSegments[0].id]);
        }

        console.log("All sounds preloaded successfully");
      } catch (error) {
        console.error("Error preloading sounds:", error);
        Alert.alert("Error", "Failed to load audio files");
      } finally {
        setIsLoading(false);
      }
    };

    preloadSounds();

    return () => {
      // Cleanup when component unmounts
      const cleanupSounds = async () => {
        for (const key in soundsRef.current) {
          await soundsRef.current[key].unloadAsync();
        }
        soundsRef.current = {};

        if (sound) {
          await sound.unloadAsync();
        }
      };

      cleanupSounds();

      if (positionUpdateInterval.current) {
        clearInterval(positionUpdateInterval.current);
      }
    };
  }, [recordingSegments]);

  // Manual implementation of continuous playback
  const playAllSegments = async (startIndex?: number) => {
    if (isLoading || recordingSegments.length === 0) {
      console.log("Cannot play: loading or no segments");
      return;
    }

    try {
      // Start with the active segment
      // Use the provided startIndex if available, otherwise use activeSegmentIndex
      const segmentIndex = startIndex !== undefined ? startIndex : activeSegmentIndex;
      const currentSegmentId = recordingSegments[segmentIndex].id;
      const currentSound = soundsRef.current[currentSegmentId];
      // console.log("current sound--->", currentSound);

      if (!currentSound) {
        console.error("Current sound not found in preloaded sounds");
        return;
      }

      setSound(currentSound);

      // Start playing the current segment
      await currentSound.setPositionAsync(0);
      await currentSound.playAsync();
      setIsPlaying(true);

      // Set up an interval to track position and handle segment transitions
      if (positionUpdateInterval.current) {
        clearInterval(positionUpdateInterval.current);
      }

      console.log('active segment index', segmentIndex)
      let currentSegmentIndex = segmentIndex;
      let overallPosition = currentSegmentIndex * 2; // Start from the current segment
      const segmentDuration = 2; // Estimated duration per segment in seconds

      positionUpdateInterval.current = setInterval(async () => {
        console.log('checking for', currentSegmentIndex)
        try {
          const currentSegmentId = recordingSegments[currentSegmentIndex].id;
          const currentSound = soundsRef.current[currentSegmentId];

          if (!currentSound) {
            console.error("Sound not found in interval");
            return;
          }

          const status = await currentSound.getStatusAsync();

          if (!status.isLoaded) {
            console.log("Sound not loaded in interval");
            return;
          }

          // Get current position within the current segment
          const segmentPosition = status.positionMillis / 1000;

          // Calculate overall position
          overallPosition =
            currentSegmentIndex * segmentDuration + segmentPosition;
          setCurrentPosition(overallPosition);
          progressAnimation.value = overallPosition / totalDuration;

          // Determine which segment should be active
          const activeIndex = Math.min(
            Math.floor(overallPosition / segmentDuration),
            recordingSegments.length - 1
          );

          if (activeIndex !== activeSegmentIndex) {
            setActiveSegmentIndex(activeIndex);

            // Scroll to active segment
            if (scrollViewRef.current) {
              scrollViewRef.current.scrollTo({
                y: activeIndex * 60, // Approximate height of each segment
                animated: true,
              });
            }
          }


          if (currentSegmentIndex == recordingSegments.length - 1) {
            clearInterval(positionUpdateInterval.current!);
            setIsPlaying(false);
            setCurrentPosition(0);
            progressAnimation.value = 0;
            setActiveSegmentIndex(0);
            await currentSound.stopAsync();
            await currentSound.setPositionAsync(0);
            return;
          }

          // Check if we need to move to the next segment
          if (status.didJustFinish || segmentPosition >= segmentDuration) {
            currentSegmentIndex++;

            // Stop the current sound
            await currentSound.stopAsync();
            await currentSound.setPositionAsync(0);

            // Get the next sound from our preloaded sounds
            const nextSegmentId = recordingSegments[currentSegmentIndex].id;
            const nextSound = soundsRef.current[nextSegmentId];

            if (!nextSound) {
              console.error("Next sound not found in preloaded sounds");
              return;
            }

            setSound(nextSound);
            await nextSound.setPositionAsync(0);
            await nextSound.playAsync();
          }
        } catch (intervalError) {
          console.error("Error in playback interval:", intervalError);
        }
      }, 200);
    } catch (error) {
      console.error("Error playing segments:", error);
    }
  };

  const seekToPosition = async (position: number) => {
    console.log('seeking to position---->:', position);
    if (isLoading || recordingSegments.length === 0) return;

    try {
      // stop the sound
      if (sound) {
        setIsPlaying(false);
        await sound.stopAsync();
      }

      // Ensure position is within bounds
      const clampedPosition = Math.max(0, Math.min(position, totalDuration));
      
      console.log('clamped position', clampedPosition)
      // Update UI immediately for better responsiveness
      setCurrentPosition(clampedPosition);
      progressAnimation.value = clampedPosition / totalDuration;

      // Calculate which segment this position corresponds to
      const segmentDuration = 2; // seconds
      const targetSegmentIndex = Math.min(
        Math.floor(clampedPosition / segmentDuration),
        recordingSegments.length - 1
      );
      console.log('tartget segmentt inde', targetSegmentIndex)
      setActiveSegmentIndex(targetSegmentIndex);

      // Stop current playback and interval immediately
      if (positionUpdateInterval.current) {
        clearInterval(positionUpdateInterval.current);
        positionUpdateInterval.current = null;
      }

      // Stop current sound completely (not just pause)
      const wasPlaying = isPlaying;
      // if (sound) {
      //   setIsPlaying(false);
      //   await sound.stopAsync();
      // }

      // Get the target sound from our preloaded sounds
      const targetSegmentId = recordingSegments[targetSegmentIndex].id;
      const targetSound = soundsRef.current[targetSegmentId];

      if (!targetSound) {
        console.error("Target sound not found in preloaded sounds");
        return;
      }

      // Set the new sound as the current sound
      setSound(targetSound);

      // Calculate position within the segment
      const segmentPosition = clampedPosition % segmentDuration;
      await targetSound.setPositionAsync(segmentPosition * 1000);

      // If we were playing, start playback again with the new sound
      if (wasPlaying) {
        await targetSound.playAsync();
        setIsPlaying(true);
        
        // Start a new playback sequence from this position
        // We need to create a new interval to handle continuous playback
        setTimeout(() => {
          playAllSegments(targetSegmentIndex);
        }, 100)
      }
    } catch (error) {
      console.error("Error seeking:", error);
    }
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

  const goToMain = () => {
    router.back();
    clearRecordingSegments();
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={{ paddingBottom: 10, marginTop: 20 }}
        >
          {recordingSegments.map((segment, index) => (
            <TouchableOpacity
              key={segment.id || index}
              style={[
                styles.segmentItem,
                activeSegmentIndex === index && styles.activeSegment,
              ]}
              onPress={() => seekToPosition(index * 2)}
            >
              <View style={styles.segmentHeader}>
                <Text style={styles.timestampText}>
                  {formatTime(index * 2)}
                </Text>
                <Text style={styles.transcriptionText}>
                  {segment.transcription || "No transcription available"}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      <PlayBackBar
        currentPosition={currentPosition}
        totalDuration={totalDuration}
        isPlaying={isPlaying}
        isLoading={isLoading}
        progressAnimation={progressAnimation}
        sound={sound}
        setIsPlaying={setIsPlaying}
        setCurrentPosition={setCurrentPosition}
        positionUpdateInterval={positionUpdateInterval}
        seekToPosition={(position) => seekToPosition(position)}
        playAllSegments={playAllSegments}
      />
    </View>
  );
}

const styles = StyleSheet.create<Styles>({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
  },
  content: {
    flex: 1,
  },
  segmentItem: {
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: "transparent",
  },
  activeSegment: {
    backgroundColor: "#e6f7ff",
    borderLeftColor: "#007AFF",
  },
  segmentHeader: {
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
    gap: 10,
  },
  timestampText: {
    fontSize: 12,
    color: "#666",
  },
  transcriptionText: {
    fontSize: 14,
    color: "#333",
    flex: 1,
  },
  goToMainButton: {
    padding: 15,
    borderRadius: 8,
    marginTop: 30,
    marginBottom: 10,
    display: 'flex',
    flexDirection: 'row',
    alignItems:'center',
    justifyContent: 'space-between'
  },
  goToMainText: {
    color: "#fff",
    fontWeight: "bold",
  },
});
