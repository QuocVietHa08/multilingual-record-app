import React, { useRef, useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Dimensions,
  ActivityIndicator,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withTiming,
  withSpring 
} from "react-native-reanimated";
import { Audio } from "expo-av";

const { width } = Dimensions.get("window");

interface PlayBackBarProps {
  currentPosition: number;
  totalDuration: number;
  isPlaying: boolean;
  isLoading: boolean;
  progressAnimation: any; // Using any for Reanimated shared value
  sound: Audio.Sound | null;
  setIsPlaying: (isPlaying: boolean) => void;
  setCurrentPosition: (position: number) => void;
  positionUpdateInterval: React.MutableRefObject<NodeJS.Timeout | null>;
  seekToPosition?: (position: number) => Promise<void>; // Optional if we want to keep this in the parent
  playAllSegments?: () => Promise<void>; // Add playAllSegments function prop
}

const PlayBackBar: React.FC<PlayBackBarProps> = ({
  currentPosition,
  totalDuration,
  isPlaying,
  isLoading,
  progressAnimation,
  sound,
  setIsPlaying,
  setCurrentPosition,
  positionUpdateInterval,
  seekToPosition,
  playAllSegments,
}) => {
  const progressBarRef = useRef<View>(null);
  const [progressBarWidth, setProgressBarWidth] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  
  // Animation values for the thumb
  const thumbScale = useSharedValue(1);
  const thumbOpacity = useSharedValue(0.9);
  
  const progressStyle = useAnimatedStyle(() => {
    return {
      width: `${progressAnimation.value * 100}%`,
    };
  });
  
  // Animated style for the thumb
  const thumbStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: thumbScale.value }],
      opacity: thumbOpacity.value,
      left: `${progressAnimation.value * 100}%`
    };
  });

  // Create a PanResponder for the slider thumb
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        setIsDragging(true);
        // Animate the thumb to show it's being dragged
        thumbScale.value = withSpring(1.3);
        thumbOpacity.value = withTiming(1);
        
        // Pause playback while dragging
        if (isPlaying) {
          pausePlayback();
        }
      },
      onPanResponderMove: (event: GestureResponderEvent, gestureState: PanResponderGestureState) => {
        if (progressBarWidth <= 0) return;
        console.log('cehcking--->')
        
        // Get the absolute position of the progress bar
        progressBarRef.current?.measure((x, y, width, height, pageX, pageY) => {
          // Calculate new position based on drag, relative to the progress bar
          const touchX = event.nativeEvent.pageX;
          const relativeX = Math.max(0, Math.min(touchX - pageX, width));
          const positionRatio = relativeX / width;
          const newTimePosition = positionRatio * totalDuration;
          
          // Update UI immediately for better responsiveness
          setCurrentPosition(newTimePosition);
          progressAnimation.value = positionRatio;
        });
      },
      onPanResponderRelease: async (event, gestureState) => {
        if (progressBarWidth <= 0 || !seekToPosition) return;
        
        // Reset the thumb animation
        thumbScale.value = withSpring(1);
        thumbOpacity.value = withTiming(0.9);
        
        // Get the absolute position of the progress bar
        progressBarRef.current?.measure((x, y, width, height, pageX, pageY) => {
          // Calculate final position
          const touchX = event.nativeEvent.pageX;
          const relativeX = Math.max(0, Math.min(touchX - pageX, width));
          const positionRatio = relativeX / width;
          const newTimePosition = positionRatio * totalDuration;
          
          // Seek to the new position
          seekToPosition(newTimePosition);
          setIsDragging(false);
        });
      },
    })
  ).current;

  // Format time function (moved from record.tsx)
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes < 10 ? "0" : ""}${minutes}:${
      remainingSeconds < 10 ? "0" : ""
    }${remainingSeconds}`;
  };

  // Play/Pause function
  const handlePlayPause = async () => {
    if (isPlaying) {
      await pausePlayback();
    } else {
      // Call the playAllSegments function from the parent component
      if (playAllSegments) {
        await playAllSegments();
      }
    }
  };

  // Pause playback function (moved from record.tsx)
  const pausePlayback = async () => {
    if (!sound) return;

    try {
      await sound.pauseAsync();
      setIsPlaying(false);

      // Clear the interval when paused
      if (positionUpdateInterval.current) {
        clearInterval(positionUpdateInterval.current);
        positionUpdateInterval.current = null;
      }
    } catch (error) {
      console.error("Error pausing sound:", error);
    }
  };

  // Handle progress bar press (moved from record.tsx)
  const handleProgressBarPress = (event: any) => {
    if (!seekToPosition || isDragging) return;
    
    const { locationX } = event.nativeEvent;
    const position = (locationX / progressBarWidth) * totalDuration;
    seekToPosition(position);
  };

  // Measure the width of the progress bar for accurate calculations
  const onProgressBarLayout = (event: any) => {
    setProgressBarWidth(event.nativeEvent.layout.width);
  };

  return (
    <View style={styles.playbackBar}>
      <View style={styles.timeContainer}>
        <Text style={styles.timeText}>{formatTime(currentPosition)}</Text>
        <View
          ref={progressBarRef}
          style={styles.progressBar}
          onLayout={onProgressBarLayout}
        >
          <TouchableOpacity
            style={styles.progressBarTouchable}
            onPress={handleProgressBarPress}
            activeOpacity={0.8}
          >
            <Animated.View style={[styles.progressIndicator, progressStyle]} />
          </TouchableOpacity>
          <Animated.View 
            style={[
              styles.sliderThumb, 
              thumbStyle
            ]} 
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
            {...panResponder.panHandlers}
          >
            <View style={styles.thumbDragIcon} />
          </Animated.View>
        </View>
        <Text style={styles.timeText}>{formatTime(totalDuration)}</Text>
      </View>

      <View style={styles.controlsContainer}>
        {isLoading ? (
          <ActivityIndicator size="small" color="#007AFF" />
        ) : (
          <TouchableOpacity
            style={styles.controlButton}
            onPress={handlePlayPause}
          >
            <Ionicons
              name={isPlaying ? "pause" : "play"}
              size={24}
              color="#007AFF"
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  playbackBar: {
    marginTop: 20,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    display: "flex",
    flexDirection: "row-reverse",
    justifyContent: "flex-start",
    gap: 5,
  },
  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "85%",
  },
  timeText: {
    fontSize: 12,
    color: "#666",
    width: 40,
    textAlign: "center",
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: "#ddd",
    borderRadius: 3,
    marginHorizontal: 10,
    overflow: "visible",
    position: "relative",
  },
  progressBarTouchable: {
    width: "100%",
    height: "100%",
    overflow: "hidden",
    borderRadius: 3,
  },
  progressIndicator: {
    height: "100%",
    backgroundColor: "#007AFF",
    borderRadius: 3,
  },
  sliderThumb: {
    position: 'absolute',
    width: 24,
    height: 24,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    top: -9,
    marginLeft: -12,
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
    zIndex: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbDragIcon: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  controlsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  controlButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 5,
  },
});

export default PlayBackBar;