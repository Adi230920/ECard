export const isManagedCardImage = (
  imageUri: string,
  documentDirectory: string | null
): boolean => Boolean(documentDirectory && imageUri.startsWith(`${documentDirectory}card_`));
