import { Tabs } from 'expo-router'
import { Colors } from '@/lib/theme'
import { Ionicons } from '@expo/vector-icons'

const icon: Record<string, [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]> = {
  index: ['document-text-outline', 'document-text'],
  ask: ['chatbubble-ellipses-outline', 'chatbubble-ellipses'],
  settings: ['settings-outline', 'settings'],
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.mutedForeground,
        tabBarStyle: {
          backgroundColor: Colors.card,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: 62,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      {(Object.keys(icon) as Array<keyof typeof icon>).map((name) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={icon[name][focused ? 1 : 0]} size={size} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  )
}
