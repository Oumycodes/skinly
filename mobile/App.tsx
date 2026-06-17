import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthGate } from './src/components/AuthGate';
import { FontProvider } from './src/components/FontProvider';
import { colors } from './src/constants/colors';
import { AuthProvider } from './src/lib/auth/AuthProvider';
import { RootNavigator } from './src/navigation/RootNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <FontProvider>
        <AuthProvider>
          <NavigationContainer>
            <StatusBar style="dark" backgroundColor={colors.background} />
            <AuthGate>
              <RootNavigator />
            </AuthGate>
          </NavigationContainer>
        </AuthProvider>
      </FontProvider>
    </SafeAreaProvider>
  );
}
