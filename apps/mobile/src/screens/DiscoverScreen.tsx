// DiscoverScreen.tsx
// Developer: Marcus Daley
// Date: 2026-04-30
// Purpose: Discover tab — benefits discovery with offline-cached content support
import type { FC } from 'react';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  COLOR_GOLD,
  COLOR_NAVY,
  COLOR_PARCHMENT,
  FONT_SIZE_LG,
  FONT_SIZE_MD,
  SPACING_LG,
  SPACING_MD,
  SPACING_SM,
  BORDER_RADIUS_MD,
} from '@/constants/theme';
import { useCachedContent } from '@/hooks/useCachedContent';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

const SECTION_TITLE = 'Benefits Discovery' as const;
const PLACEHOLDER_MSG =
  'Connect to discover benefits you may have earned. 56+ benefits across 10 categories.' as const;
const COMING_SOON = 'Full benefits list loading...' as const;
const CACHED_INDICATOR = '(cached)' as const;

// Cache key for hidden-gems benefits list — namespaced to match useCachedContent prefix
const BENEFITS_CACHE_KEY = 'benefits:hidden-gems' as const;

// MVP API endpoint — no API client package yet on mobile
const BENEFITS_API_URL = 'http://localhost:3001/api/benefits/hidden-gems' as const;

export const DiscoverScreen: FC = () => {
  const { isOnline } = useNetworkStatus();
  const { getCachedBenefits, cacheContent } = useCachedContent();

  const [benefits, setBenefits] = useState<unknown>(null);
  const [isFromCache, setIsFromCache] = useState<boolean>(false);

  useEffect(() => {
    if (isOnline) {
      // Fetch fresh data and cache it for later offline use
      void (async () => {
        try {
          const response = await fetch(BENEFITS_API_URL);
          if (!response.ok) return;
          const data: unknown = await response.json();
          setBenefits(data);
          setIsFromCache(false);
          await cacheContent(BENEFITS_CACHE_KEY, data);
        } catch {
          // Fetch failed — fall through to cached data below
        }
      })();
    } else {
      // Offline — load from AsyncStorage cache
      void (async () => {
        const cached = await getCachedBenefits();
        if (cached !== null) {
          setBenefits(cached);
          setIsFromCache(true);
        }
      })();
    }
  }, [isOnline, getCachedBenefits, cacheContent]);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{SECTION_TITLE}</Text>
        {isFromCache && (
          <Text style={styles.cachedIndicator}>{CACHED_INDICATOR}</Text>
        )}
      </View>
      <View style={styles.card}>
        <Text style={styles.placeholder}>{PLACEHOLDER_MSG}</Text>
      </View>
      {!benefits && (
        <Text style={styles.comingSoon}>{COMING_SOON}</Text>
      )}
      {/* TODO: render BenefitCard list once BenefitCard component exists */}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: { backgroundColor: COLOR_NAVY },
  container: { padding: SPACING_LG },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING_MD,
  },
  title: {
    color: COLOR_GOLD,
    fontSize: FONT_SIZE_LG,
    fontWeight: 'bold',
  },
  cachedIndicator: {
    color: COLOR_PARCHMENT,
    fontSize: FONT_SIZE_MD,
    opacity: 0.6,
    marginLeft: SPACING_SM,
  },
  card: {
    borderWidth: 1,
    borderColor: COLOR_GOLD,
    borderRadius: BORDER_RADIUS_MD,
    padding: SPACING_MD,
    marginBottom: SPACING_MD,
  },
  placeholder: {
    color: COLOR_PARCHMENT,
    fontSize: FONT_SIZE_MD,
  },
  comingSoon: {
    color: COLOR_PARCHMENT,
    fontSize: FONT_SIZE_MD,
    opacity: 0.5,
    marginTop: SPACING_SM,
  },
});
