import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { CustomTabBar } from '../components/navigation/CustomTabBar';
import { HomeScreen } from '../screens/HomeScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { ProgressScreen } from '../screens/ProgressScreen';
import { RoutineScreen } from '../screens/RoutineScreen';
import { ScanResultScreen } from '../screens/ScanResultScreen';
import { ScanScreen } from '../screens/ScanScreen';
import { ShelfScreen } from '../screens/ShelfScreen';
import type { RootStackParamList, RootTabParamList, ScanStackParamList } from './types';

const Tab = createBottomTabNavigator<RootTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();
const ScanStack = createNativeStackNavigator<ScanStackParamList>();

function ScanStackNavigator() {
  return (
    <ScanStack.Navigator screenOptions={{ headerShown: false }}>
      <ScanStack.Screen name="ScanCamera" component={ScanScreen} />
      <ScanStack.Screen name="ScanResult" component={ScanResultScreen} />
    </ScanStack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Progress" component={ProgressScreen} />
      <Tab.Screen name="Shelf" component={ShelfScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={MainTabs} />
      <Stack.Screen
        name="ScanFlow"
        component={ScanStackNavigator}
        options={{ presentation: 'fullScreenModal' }}
      />
      <Stack.Screen
        name="Routine"
        component={RoutineScreen}
        options={{ presentation: 'modal' }}
      />
    </Stack.Navigator>
  );
}
