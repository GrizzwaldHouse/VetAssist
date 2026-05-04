// OfflineBanner.tsx
// Developer: Marcus Daley
// Date: 2026-04-30
// Purpose: Non-dismissable banner shown when the device is offline.
//          Follows the same structure as CrisisLineBanner — no close button, always visible when offline.

import type { FC } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  BORDER_RADIUS_MD,
  COLOR_GOLD,
  COLOR_NAVY,
  COLOR_PARCHMENT,
  FONT_SIZE_MD,
  SPACING_MD,
  SPACING_SM,
} from '@/constants/theme';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

const OFFLINE_TITLE   = "You're offline" as const;
const OFFLINE_SUBTEXT = 'AI features unavailable — educational content still accessible.' as const;

export const OfflineBanner: FC = () => {
  const { isOnline } = useNetworkStatus();

  // Render nothing when online — no layout shift
  if (isOnline) return null;

  return (
    <View
      style={styles.container}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <Text style={styles.title}>{OFFLINE_TITLE}</Text>
      <Text style={styles.subtext}>{OFFLINE_SUBTEXT}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLOR_NAVY,
    borderBottomWidth: 2,
    borderBottomColor: COLOR_GOLD,
    borderRadius: BORDER_RADIUS_MD,
    padding: SPACING_MD,
    marginBottom: SPACING_SM,
  },
  title: {
    color: COLOR_GOLD,
    fontSize: FONT_SIZE_MD,
    fontWeight: 'bold',
    marginBottom: SPACING_SM,
  },
  subtext: {
    color: COLOR_PARCHMENT,
    fontSize: FONT_SIZE_MD,
  },
});
