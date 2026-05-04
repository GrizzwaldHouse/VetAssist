// HomeScreen.tsx
// Developer: Marcus Daley
// Date: 2026-04-30
// Purpose: Home tab — welcome screen with app identity and navigation prompts to key features
import type { FC } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  COLOR_GOLD,
  COLOR_NAVY,
  COLOR_PARCHMENT,
  FONT_SIZE_LG,
  FONT_SIZE_MD,
  FONT_SIZE_XL,
  SPACING_LG,
  SPACING_MD,
  SPACING_SM,
} from '@/constants/theme';

const APP_TAGLINE = 'Your AI Battle Buddy for VA Benefits' as const;
const APP_NAME = 'VetAssist' as const;
const DISCLAIMER =
  'Educational platform only. Not a law firm, claims filing service, or outcome guarantor.' as const;

const FEATURE_ITEMS = [
  'Chat — Ask questions about your benefits',
  'Documents — Review and improve your paperwork',
  'Discover — Find benefits you may have earned',
  'Community — Read and share veteran stories',
] as const;

export const HomeScreen: FC = () => (
  <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
    <Text style={styles.title}>{APP_NAME}</Text>
    <Text style={styles.tagline}>{APP_TAGLINE}</Text>
    <View style={styles.divider} />
    {FEATURE_ITEMS.map((item) => (
      <Text key={item} style={styles.featureItem}>
        • {item}
      </Text>
    ))}
    <View style={styles.divider} />
    <Text style={styles.disclaimer}>{DISCLAIMER}</Text>
  </ScrollView>
);

const styles = StyleSheet.create({
  scroll: { backgroundColor: COLOR_NAVY },
  container: { padding: SPACING_LG },
  title: {
    color: COLOR_GOLD,
    fontSize: FONT_SIZE_XL,
    fontWeight: 'bold',
    marginBottom: SPACING_SM,
  },
  tagline: {
    color: COLOR_PARCHMENT,
    fontSize: FONT_SIZE_LG,
    marginBottom: SPACING_MD,
  },
  divider: {
    height: 1,
    backgroundColor: COLOR_GOLD,
    marginVertical: SPACING_MD,
    opacity: 0.3,
  },
  featureItem: {
    color: COLOR_PARCHMENT,
    fontSize: FONT_SIZE_MD,
    marginBottom: SPACING_SM,
  },
  disclaimer: {
    color: COLOR_PARCHMENT,
    fontSize: FONT_SIZE_MD,
    opacity: 0.6,
    fontStyle: 'italic',
  },
});
