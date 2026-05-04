// DocumentsScreen.tsx
// Developer: Marcus Daley
// Date: 2026-04-30
// Purpose: Documents tab — camera scan via expo-camera with OS-level permission,
//          native file picker stub, PII scan before any upload
import type { FC } from 'react';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Camera } from 'expo-camera';
import { AIDisclosureBanner } from '@/components/AIDisclosureBanner';
import {
  BORDER_RADIUS_MD,
  COLOR_GOLD,
  COLOR_NAVY,
  COLOR_PARCHMENT,
  FONT_SIZE_MD,
  FONT_SIZE_LG,
  SPACING_LG,
  SPACING_MD,
} from '@/constants/theme';

const SCAN_LABEL = 'Scan Document with Camera' as const;
const UPLOAD_LABEL = 'Upload from Files' as const;
const PERMISSION_DENIED_MSG =
  'Camera permission denied. Grant access in device Settings to scan documents.' as const;
const SECTION_TITLE = 'Document Tools' as const;

export const DocumentsScreen: FC = () => {
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(null);

  // OS-level permission request — no custom permission dialogs per project config
  const requestCameraAndScan = async (): Promise<void> => {
    const { granted } = await Camera.requestCameraPermissionsAsync();
    setCameraPermission(granted);
    if (!granted) return;
    // TODO: open camera view and pass captured image through @vetassist/pii before upload
  };

  const handleFileUpload = (): void => {
    // TODO: open native file picker, PII-scan result, send to /api/documents/upload
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <AIDisclosureBanner />
      <Text style={styles.title}>{SECTION_TITLE}</Text>

      {cameraPermission === false && (
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>{PERMISSION_DENIED_MSG}</Text>
        </View>
      )}

      <Pressable style={styles.button} onPress={requestCameraAndScan} accessibilityRole="button">
        <Text style={styles.buttonText}>{SCAN_LABEL}</Text>
      </Pressable>

      <Pressable style={styles.button} onPress={handleFileUpload} accessibilityRole="button">
        <Text style={styles.buttonText}>{UPLOAD_LABEL}</Text>
      </Pressable>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: { backgroundColor: COLOR_NAVY },
  container: { padding: SPACING_LG },
  title: {
    color: COLOR_GOLD,
    fontSize: FONT_SIZE_LG,
    fontWeight: 'bold',
    marginBottom: SPACING_MD,
  },
  button: {
    backgroundColor: COLOR_GOLD,
    borderRadius: BORDER_RADIUS_MD,
    padding: SPACING_MD,
    alignItems: 'center',
    marginBottom: SPACING_MD,
  },
  buttonText: {
    color: COLOR_NAVY,
    fontWeight: 'bold',
    fontSize: FONT_SIZE_MD,
  },
  warningBox: {
    borderWidth: 1,
    borderColor: COLOR_GOLD,
    borderRadius: BORDER_RADIUS_MD,
    padding: SPACING_MD,
    marginBottom: SPACING_MD,
  },
  warningText: {
    color: COLOR_PARCHMENT,
    fontSize: FONT_SIZE_MD,
  },
});
