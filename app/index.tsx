import { useRouter } from 'expo-router';
import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { View, StyleSheet, TouchableOpacity, Text, ViewStyle, TextStyle, Alert } from 'react-native';
// import { useAudioRecorder, RecordingOptions, AudioModule, RecordingPresets } from 'expo-audio';
import { useAppStore, setAppStore } from '@/src/store/appStore';
import { Audio } from 'expo-av';

interface Styles {
  container: ViewStyle;
  content: ViewStyle;
  title: TextStyle;
  recordButton: ViewStyle;
  recording: ViewStyle;
  instructions: TextStyle;
}

export default function Index() {
  const router = useRouter();
  const [recording, setRecording] = useState<Audio.Recording>();
  const [permissionResponse, requestPermission] = Audio.usePermissions();

  async function startRecording() {
    try {
      if (permissionResponse && permissionResponse.status !== 'granted') {
        console.log('Requesting permission..');
        await requestPermission();
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      console.log('Starting recording..');
      const { recording } = await Audio.Recording.createAsync( Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      console.log('Recording started');
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  }

  async function stopRecording() {
    if (!recording) return
    console.log('Stopping recording..');
    setRecording(undefined);
    await recording.stopAndUnloadAsync();
    await Audio.setAudioModeAsync(
      {
        allowsRecordingIOS: false,
      }
    );
    const uri = recording.getURI();
    router.push('/record')
    console.log('Recording stopped and stored at', uri);
  }

 

  const handleRecord = (): void => {
    recording ? stopRecording() : startRecording();
  };

    return (
    <View style={styles.container}>
      <View style={styles.content}>
        <TouchableOpacity
          style={[styles.recordButton, recording && styles.recording]}
          onPress={handleRecord}
        >
          <Ionicons
            name={recording ? "stop" : "mic"} 
            size={40} 
            color="white" 
          />
        </TouchableOpacity>
        <Text style={styles.instructions}>
          {recording ? "Tap to stop recording" : "Tap to start recording"}
        </Text>
      </View>
    </View>
  );
}


const styles = StyleSheet.create<Styles>({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 40,
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  recording: {
    backgroundColor: '#FF3B30',
  },
  instructions: {
    fontSize: 16,
    color: '#666',
  },
});