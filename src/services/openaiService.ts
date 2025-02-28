import * as FileSystem from 'expo-file-system';

// Define API types
interface OpenAITranscriptionResponse {
  text: string;
}

/**
 * Service to handle OpenAI API interactions
 */
export class OpenAIService {
  apiKey: string; 
  private baseUrl: string = 'https://api.openai.com/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Transcribe audio file using OpenAI Whisper API
   * @param fileUri Local URI of the audio file to transcribe
   * @returns Transcription text
   */
  async transcribeAudio(fileUri: string): Promise<string> {
    try {
      // First, check if the file exists
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (!fileInfo.exists) {
        throw new Error(`File does not exist at path: ${fileUri}`);
      }

      console.log('File exists, preparing to upload:', fileUri);

      // In React Native, we need to use a different approach for file uploads
      // We'll use Expo FileSystem's uploadAsync method
      const formData = new FormData();
      
      // Add the file to form data using the file URI directly
      formData.append('file', {
        uri: fileUri,
        name: 'recording.m4a',
        type: 'audio/m4a'
      } as any);
      
      formData.append('model', 'whisper-1');
      formData.append('response_format', 'json');
      // Add prompt to customize transcription behavior
  formData.append('prompt', 'Transcribe the voice to Vietnamese or English depending on the language detected.');

      
      console.log('FormData prepared, sending to OpenAI API');
      
      // Make the API request
      const response = await fetch(`${this.baseUrl}/audio/transcriptions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'application/json',
        },
        body: formData,
      });
      
      console.log('API response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI API error response:', errorText);
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json() as OpenAITranscriptionResponse;
      console.log('Transcription successful:', data);
      return data.text;
    } catch (error) {
      console.error('Error transcribing audio:', error);
      throw error;
    }
  }
}

// Create and export a singleton instance
let openAIService: OpenAIService | null = null;

export const getOpenAIService = (apiKey: string): OpenAIService => {
  if (!openAIService || openAIService.apiKey !== apiKey) {
    openAIService = new OpenAIService(apiKey);
  }
  return openAIService;
};
