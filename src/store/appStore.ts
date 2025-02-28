import { create } from 'zustand';

export interface RecordingSegment {
  id: string
  uri: string;
  timestamp: number;
  transcription?: string;
}

interface AppStore {
  recordingSegments: RecordingSegment[];
  isRecording: boolean;
  addRecordingSegment: (segment: RecordingSegment) => void;
  clearRecordingSegments: () => void;
  setIsRecording: (isRecording: boolean) => void;
  updateSegmentTranscription: (segmentId: string, transcription: string) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  recordingSegments: [],
  isRecording: false,
  addRecordingSegment: (segment) =>
    set((state) => ({
      recordingSegments: [...state.recordingSegments, segment],
    })),
  clearRecordingSegments: () => set({ recordingSegments: [] }),
  setIsRecording: (isRecording) => set({ isRecording }),
  updateSegmentTranscription: (segmentId, transcription) =>
    set((state) => {
      const updatedSegments = [...state.recordingSegments].map((item) => {
        if (item.id == segmentId) {
          return {
            ...item, 
            transcription: transcription,
          }
        }
        return item
      });
      return { recordingSegments: updatedSegments };
    }),
}));

export const appStore = useAppStore.getState
export const setAppStore = (state: Partial<AppStore>) => {
  const store = useAppStore.getState();
  for (const key in state) {
    if (key in store) {
      // @ts-ignore
      store[key] = state[key];
    }
  }
};
