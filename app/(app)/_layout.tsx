import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const TAB_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: 'home-outline',
  'properties/index': 'business-outline',
  'history/index': 'time-outline',
  'settings/index': 'settings-outline',
};

const TAB_ICON_FOCUSED: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: 'home',
  'properties/index': 'business',
  'history/index': 'time',
  'settings/index': 'settings',
};

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: '#6B7280',
        tabBarStyle: {
          borderTopColor: '#F3F4F6',
          backgroundColor: '#FFFFFF',
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        tabBarIcon: ({ color, size, focused }) => {
          const icons = focused ? TAB_ICON_FOCUSED : TAB_ICON;
          const iconName = icons[route.name] ?? 'ellipse-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tabs.Screen
        name="index"
        options={{ tabBarLabel: 'Home' }}
      />
      <Tabs.Screen
        name="properties"
        options={{ tabBarLabel: 'Properties' }}
      />
      <Tabs.Screen
        name="history"
        options={{ tabBarLabel: 'History' }}
      />
      <Tabs.Screen
        name="settings"
        options={{ tabBarLabel: 'Settings' }}
      />
      <Tabs.Screen
        name="inspection"
        options={{ href: null }}
      />
    </Tabs>
  );
}
