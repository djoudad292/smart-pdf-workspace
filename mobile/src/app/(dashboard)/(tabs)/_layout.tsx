import { Tabs } from 'expo-router'
import { Colors } from '@/lib/theme'
import { Ionicons } from '@expo/vector-icons'

const icon: Record<string, [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]> = {
  index: ['document-text-outline', 'document-text'],
  ask: ['chatbubble-ellipses-outline', 'chatbubble-ellipses'],
  settings: ['settings-outline', 'settings'],
}

const labels: Record<string, string> = {
  index: 'Docs',
  ask: 'Ask',
  settings: 'Settings',
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.mutedForeground,
        tabBarActiveBackgroundColor: Colors.primarySoft,
        tabBarStyle: {
          backgroundColor: Colors.card,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarItemStyle: { borderRadius: 14, marginHorizontal: 6 },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600', marginTop: 2 },
      }}
    >
      {(Object.keys(icon) as Array<keyof typeof icon>).map((name) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title: labels[name],
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={icon[name][focused ? 1 : 0]} size={size} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  )
}
