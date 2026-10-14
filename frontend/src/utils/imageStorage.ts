import * as FileSystem from 'expo-file-system/legacy';

/**
 * Saves a temporary image file to the app's persistent document directory.
 * @param sourceUri The URI of the source image (e.g., from camera or gallery)
 * @returns The new permanent URI of the saved image
 */
export const saveCardImage = async (sourceUri: string): Promise<string> => {
  try {
    const filename = `card_${Date.now()}.jpg`;
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
