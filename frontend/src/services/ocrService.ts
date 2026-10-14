import { Platform } from 'react-native';
import type { RecognitionResult } from 'expo-mlkit-ocr';

export type OcrResult = RecognitionResult;

export type OcrErrorCode =
  | 'invalid-image-uri'
  | 'unsupported-platform'
  | 'native-module-unavailable'
  | 'unsupported-device'
  | 'image-load-failed'
  | 'recognition-failed';

export class OcrServiceError extends Error {
  constructor(
    public readonly code: OcrErrorCode,
    message: string,
    options?: { cause?: unknown }
  ) {
    super(message, options);
    this.name = 'OcrServiceError';
  }
}

type NativeOcrError = Error & { code?: string };

const isMissingNativeModuleError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;

  return (
    error.message.includes("Cannot find native module 'ExpoMlkitOcr'") ||
    (error.message.includes('ExpoMlkitOcr') && error.message.includes('native module'))
  );
};

const normalizeOcrError = (error: unknown): OcrServiceError => {
  if (error instanceof OcrServiceError) return error;

  if (isMissingNativeModuleError(error)) {
    return new OcrServiceError(
      'native-module-unavailable',
      'OCR requires a development build and is unavailable in Expo Go.',
      { cause: error }
    );
  }

  const nativeError = error as NativeOcrError;

  if (nativeError?.code === 'INVALID_URI') {
    return new OcrServiceError('invalid-image-uri', 'The card image path is invalid.', {
      cause: error,
    });
  }

  if (nativeError?.code === 'IMAGE_LOAD_FAILED') {
    return new OcrServiceError(
      'image-load-failed',
      'The card image could not be opened or is unsupported.',
      { cause: error }
    );
  }

  return new OcrServiceError(
    'recognition-failed',
    'Text recognition failed. Try a clearer card image.',
    { cause: error }
  );
};

/**
 * Recognizes text locally and retains ML Kit's blocks, lines, elements, and bounding boxes.
 */
export const recognizeCardText = async (imageUri: string): Promise<OcrResult> => {
  if (!imageUri.trim()) {
    throw new OcrServiceError('invalid-image-uri', 'No card image was provided.');
  }

  if (Platform.OS === 'web') {
    throw new OcrServiceError(
      'unsupported-platform',
      'On-device OCR is only available on Android and iOS.'
    );
  }

  try {
    // Loaded on demand so Expo Go can show a useful error instead of crashing at startup.
    const { isSupported, recognizeText } = await import('expo-mlkit-ocr');

    if (!isSupported()) {
      throw new OcrServiceError(
        'unsupported-device',
        'On-device OCR is not supported by this device.'
      );
    }

    return await recognizeText(imageUri);
  } catch (error) {
    throw normalizeOcrError(error);
  }
};
