import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: true }}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="map" options={{ title: 'Map' }} />
      <Tabs.Screen name="poi" options={{ title: 'Places' }} />
      <Tabs.Screen name="expenses" options={{ title: 'Split' }} />
      <Tabs.Screen name="convoy" options={{ title: 'Convoy' }} />
      <Tabs.Screen name="safety" options={{ title: 'Safety' }} />
      <Tabs.Screen name="pro" options={{ title: 'Pro' }} />
    </Tabs>
  );
}
