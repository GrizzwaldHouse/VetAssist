// AIDisclosureBanner.tsx
// Developer: Marcus Daley
// Date: 2026-04-30
// Purpose: Required disclosure banner on every AI-powered screen. Not dismissable.
import type { FC } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  BORDER_RADIUS_SM,
  COLOR_NAVY,
  COLOR_PARCHMENT,
  FONT_SIZE_SM,
  SPACING_MD,
  SPACING_SM,
} from '@/constants/theme';

const DISCLOSURE_TEXT =
  'This feature uses AI. Results are educational only — not legal or medical advice.' as const;

export const AIDisclosureBanner: FC = () => (
  <View style={styles.container} accessibilityRole="text">
    <Text style={styles.text}>{DISCLOSURE_TEXT}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLOR_NAVY,
    borderRadius: BORDER_RADIUS_SM,
    borderLeftWidth: 3,
    borderLeftColor: COLOR_PARCHMENT,
    padding: SPACING_SM,
    marginBottom: SPACING_MD,
  },
  text: {
    color: COLOR_PARCHMENT,
    fontSize: FONT_SIZE_SM,
  },
});
