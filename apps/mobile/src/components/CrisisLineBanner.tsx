// CrisisLineBanner.tsx
// Developer: Marcus Daley
// Date: 2026-04-30
// Purpose: Non-dismissable crisis banner. Shown immediately when crisis keywords are detected.
//          No close button — veteran must call or navigate away from the screen to leave.
import type { FC } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  BORDER_RADIUS_MD,
  COLOR_RED,
  COLOR_WHITE,
  FONT_SIZE_MD,
  FONT_SIZE_SM,
  SPACING_MD,
  SPACING_SM,
} from '@/constants/theme';

const CRISIS_LINE_NUMBER = '988' as const;
const CRISIS_LINE_PROMPT = 'Press 1 for Veterans' as const;
const CRISIS_TEXT_LINE = 'Veterans Crisis Line' as const;
const CRISIS_SUBTEXT = `Call ${CRISIS_LINE_NUMBER} — ${CRISIS_LINE_PROMPT}` as const;
const CRISIS_SMS = 'Text 838255 | Chat at VeteransCrisisLine.net' as const;

export const CrisisLineBanner: FC = () => (
  <View style={styles.container} accessibilityRole="alert" accessibilityLiveRegion="assertive">
    <Text style={styles.title}>{CRISIS_TEXT_LINE}</Text>
    <Text style={styles.number}>{CRISIS_SUBTEXT}</Text>
    <Text style={styles.sms}>{CRISIS_SMS}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLOR_RED,
    borderRadius: BORDER_RADIUS_MD,
    padding: SPACING_MD,
    marginBottom: SPACING_SM,
  },
  title: {
    color: COLOR_WHITE,
    fontSize: FONT_SIZE_MD,
    fontWeight: 'bold',
    marginBottom: SPACING_SM,
  },
  number: {
    color: COLOR_WHITE,
    fontSize: FONT_SIZE_MD,
  },
  sms: {
    color: COLOR_WHITE,
    fontSize: FONT_SIZE_SM,
    marginTop: SPACING_SM,
  },
});
