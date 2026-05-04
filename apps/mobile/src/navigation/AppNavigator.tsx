// AppNavigator.tsx
// Developer: Marcus Daley
// Date: 2026-04-30
// Purpose: Bottom tab navigator — 5 tabs wired to named constants, no magic strings.
//          OfflineBanner rendered above the tab bar to signal when network is unavailable.
import type { FC } from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  TAB_CHAT,
  TAB_COMMUNITY,
  TAB_DISCOVER,
  TAB_DOCUMENTS,
  TAB_HOME,
} from '@/constants/navigation';
import { COLOR_GOLD, COLOR_NAVY, COLOR_PARCHMENT } from '@/constants/theme';
import { ChatScreen } from '@/screens/ChatScreen';
import { CommunityScreen } from '@/screens/CommunityScreen';
import { DiscoverScreen } from '@/screens/DiscoverScreen';
import { DocumentsScreen } from '@/screens/DocumentsScreen';
import { HomeScreen } from '@/screens/HomeScreen';
import { OfflineBanner } from '@/components/OfflineBanner';

const Tab = createBottomTabNavigator();

// Wrapper renders OfflineBanner above the navigator so it appears above the tab bar
export const AppNavigator: FC = () => (
  <View style={{ flex: 1 }}>
    <OfflineBanner />
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: COLOR_GOLD,
        tabBarInactiveTintColor: COLOR_PARCHMENT,
        tabBarStyle: { backgroundColor: COLOR_NAVY },
        headerStyle: { backgroundColor: COLOR_NAVY },
        headerTintColor: COLOR_GOLD,
      }}
    >
      <Tab.Screen name={TAB_HOME} component={HomeScreen} />
      <Tab.Screen name={TAB_CHAT} component={ChatScreen} />
      <Tab.Screen name={TAB_DOCUMENTS} component={DocumentsScreen} />
      <Tab.Screen name={TAB_DISCOVER} component={DiscoverScreen} />
      <Tab.Screen name={TAB_COMMUNITY} component={CommunityScreen} />
    </Tab.Navigator>
  </View>
);
