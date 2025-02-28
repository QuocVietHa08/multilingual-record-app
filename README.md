# Multilingual Record App

A React Native mobile application for recording, transcribing, and playing back multilingual audio segments with continuous playback functionality.

## Features

- **Audio Recording**: Record audio in segments of approximately 2 seconds each
- **Real-time Transcription**: Transcribe audio segments using OpenAI's transcription service
- **Continuous Playback**: Seamlessly play back all recorded segments with smooth transitions
- **Interactive Timeline**: Navigate through recordings with a draggable progress bar
- **Segment Highlighting**: Visual indication of the currently playing segment
- **Multilingual Support**: Works with multiple languages for transcription

## Prerequisites

- Node.js (v14 or newer)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- OpenAI API Key (for transcription functionality)

## Environment Setup

1. Create a `.env` file in the root directory with the following content:
   ```
   EXPO_PUBLIC_OPENAI_API_KEY=your_openai_api_key_here
   ```

2. Replace `your_openai_api_key_here` with your actual OpenAI API key.

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/multilingual-record.git
   cd multilingual-record
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

## Running the App

### Development Mode

1. Start the Expo development server:
   ```bash
   npx expo start
   ```

2. Use one of the following methods to run the app:
   - Scan the QR code with the Expo Go app on your mobile device
   - Press `a` to open on an Android emulator
   - Press `i` to open on an iOS simulator
   - Press `w` to open in a web browser (note: some features may not work in web mode)

### Building for Production

#### For Android

1. Build the Android APK:
   ```bash
   expo build:android -t apk
   ```

2. Or build an Android App Bundle:
   ```bash
   expo build:android -t app-bundle
   ```

#### For iOS

```bash
expo build:ios
```

## Usage Instructions

1. **Home Screen**:
   - Tap the microphone button to start recording
   - The timer at the top shows your recording duration
   - Real-time transcription appears as you speak

2. **Recording Screen**:
   - View all recorded segments with their transcriptions
   - Use the playback bar to control audio playback
   - Drag the slider to navigate to specific parts of the recording
   - Tap on any segment to jump to that point in the recording

3. **Playback Controls**:
   - Play/Pause: Control audio playback
   - Progress Bar: Shows current position in the overall recording
   - Time Display: Shows current position and total duration

## Project Structure

- `app/`: Main application screens
  - `index.tsx`: Home/recording screen
  - `record.tsx`: Playback and transcription review screen
- `src/`: Source code
  - `components/`: Reusable UI components
  - `services/`: API services (OpenAI integration)
  - `store/`: State management with Zustand

## Dependencies

- React Native
- Expo
- Expo Audio
- react-native-reanimated
- Zustand (for state management)
- OpenAI API (for transcription)

## Troubleshooting

- **Audio Permission Issues**: Ensure your device has granted microphone permissions to the app
- **Transcription Not Working**: Verify your OpenAI API key is correct in the `.env` file
- **Playback Issues**: Make sure audio files are properly saved and accessible

## License

MIT

## Contributors

- Edward Ha
- Other Contributors

---

For any questions or support, please open an issue on the GitHub repository.