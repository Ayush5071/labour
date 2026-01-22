import { Platform, Alert } from 'react-native';

/**
 * Saves base64 file and shares it on mobile, or downloads on web
 */
export const saveAndShareFile = async (
  base64: string,
  filename: string,
  mimeType: string = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  dialogTitle: string = 'Export File'
): Promise<boolean> => {
  try {
    if (Platform.OS === 'web') {
      // Web: Create download link
      const link = document.createElement('a');
      link.href = `data:${mimeType};base64,${base64}`;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return true;
    } else {
      // Mobile: Use legacy expo-file-system API
      const FileSystem = await import('expo-file-system/legacy');
      const Sharing = await import('expo-sharing');
      
      const fileUri = FileSystem.cacheDirectory + filename;
      
      await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType,
          dialogTitle,
        });
        return true;
      } else {
        Alert.alert('Success', `File saved: ${filename}`);
        return true;
      }
    }
  } catch (error: any) {
    console.error('File export error:', error);
    throw error;
  }
};
