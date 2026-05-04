// App.tsx
// Developer: Marcus Daley
// Date: 2026-04-30
// Purpose: Root component — wraps NavigationContainer around the bottom tab navigator
import type { FC } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AppNavigator } from '@/navigation/AppNavigator';

const App: FC = () => (
  <NavigationContainer>
    <AppNavigator />
  </NavigationContainer>
);

export default App;
