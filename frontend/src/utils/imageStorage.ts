import * as FileSystem from 'expo-file-system/legacy';
import { isManagedCardImage } from './imageStoragePolicy';

/**
 * Saves a temporary image file to the app's persistent document directory.
 * @param sourceUri The URI of the source image (e.g., from camera or gallery)
 * @returns The new permanent URI of the saved image
 */
export const saveCardImage = async (sourceUri: string): Promise<string> => {
  try {
    const suffix = Math.random().toString(36).slice(2, 10);
    const filename = `card_${Date.now()}_${suffix}.jpg`;
    const destinationUri = `${FileSystem.documentDirectory}${filename}`;
    
    await FileSystem.copyAsync({
      from: sourceUri,
      to: destinationUri,
    });
    
    return destinationUri;
  } catch (error) {
    console.error('Error saving image:', error);
    throw error;
  }
};

export const deleteAbandonedCardImage = async (imageUri: string): Promise<void> => {
  const documentDirectory = FileSystem.documentDirectory;
  if (!isManagedCardImage(imageUri, documentDirectory)) return;

  await FileSystem.deleteAsync(imageUri, { idempotent: true });
};
