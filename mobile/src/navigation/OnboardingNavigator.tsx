import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { OnboardingFlowScreen } from '../screens/onboarding/OnboardingFlowScreen';

export type OnboardingStackParamList = {
  Flow: undefined;
};

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export function OnboardingNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="Flow" component={OnboardingFlowScreen} />
    </Stack.Navigator>
  );
}
