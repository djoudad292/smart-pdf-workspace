import { useState, useCallback, useEffect } from 'react'
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Screen, Card, Field, Button } from '@/components/ui'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { Colors } from '@/lib/theme'

interface Company {
  id: string
  name: string
  slug: string
  plan?: string
  settings?: Record<string, any>
}

export default function SettingsScreen() {
  const router = useRouter()
  const { company, user, logout } = useAuth()
  const [title, setTitle] = useState('Ask our documents')
  const [color, setColor] = useState('#6366f1')
  const [position, setPosition] = useState<'left' | 'right'>('right')
  const [saving, setSaving] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<Company>('/companies/profile')
      const w = data.settings?.widget || {}
      setTitle(w.title || 'Ask our documents')
      setColor(w.color || '#6366f1')
      setPosition(w.position === 'left' ? 'left' : 'right')
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to load settings')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const save = async () => {
    setSaving(true)
    try {
      await apiFetch('/companies/settings', {
        method: 'PATCH',
        body: JSON.stringify({ widget: { title, color, position } }),
      })
      Alert.alert('Saved', 'Widget settings updated.')
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = () => {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          setLoggingOut(true)
          await logout()
          router.replace('/(auth)/login')
        },
      },
    ])
  }

  const colorName = (c: string) => {
    if (c === 'left') return 'Left'
    return 'Right'
  }

  return (
    <Screen scroll>
      <Text style={{ color: Colors.foreground, fontSize: 20, fontWeight: '700', marginBottom: 16 }}>Settings</Text>

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: Colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
            <Ionicons name="briefcase" size={20} color={Colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: Colors.foreground, fontSize: 15, fontWeight: '600' }}>{company?.name || 'Workspace'}</Text>
            <Text style={{ color: Colors.mutedForeground, fontSize: 12, marginTop: 2 }}>Slug: {company?.slug || '—'}</Text>
            <Text style={{ color: Colors.mutedForeground, fontSize: 12 }}>Signed in as {user?.email}</Text>
          </View>
        </View>
      </Card>

      <Card>
        <Text style={{ color: Colors.foreground, fontSize: 15, fontWeight: '700', marginBottom: 12 }}>Ask-your-docs widget</Text>

        <Field label="Widget title" value={title} onChangeText={setTitle} placeholder="Ask our documents" />

        <Text style={{ color: Colors.foreground, fontSize: 13, fontWeight: '600', marginBottom: 6 }}>Accent color</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          {['#6366F1', '#3B82F6', '#22C55E', '#F97316', '#EF4444', '#A855F7'].map((c) => (
            <TouchableOpacity
              key={c}
              onPress={() => setColor(c)}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: c,
                borderWidth: 2,
                borderColor: color === c ? Colors.foreground : 'transparent',
              }}
            />
          ))}
          <TextInput
            value={color}
            onChangeText={setColor}
            autoCapitalize="none"
            style={{
              flex: 1,
              backgroundColor: Colors.muted,
              borderWidth: 1,
              borderColor: Colors.border,
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 10,
              color: Colors.foreground,
              fontSize: 14,
            }}
          />
        </View>

        <Text style={{ color: Colors.foreground, fontSize: 13, fontWeight: '600', marginBottom: 6 }}>Position</Text>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
          {(['right', 'left'] as const).map((pos) => (
            <TouchableOpacity
              key={pos}
              onPress={() => setPosition(pos)}
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: position === pos ? Colors.primary : Colors.border,
                backgroundColor: position === pos ? Colors.primarySoft : Colors.muted,
                borderRadius: 12,
                paddingVertical: 10,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: position === pos ? Colors.primary : Colors.mutedForeground, fontSize: 14, fontWeight: '600' }}>
                {colorName(pos)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Button title="Save settings" onPress={save} loading={saving} />
      </Card>

      <Card>
        <TouchableOpacity onPress={() => router.push('/guide')} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="code-slash" size={20} color={Colors.primary} style={{ marginRight: 12 }} />
          <Text style={{ color: Colors.primary, fontSize: 15, fontWeight: '600', flex: 1 }}>Widget embed guide</Text>
          <Ionicons name="chevron-forward" size={18} color={Colors.mutedForeground} />
        </TouchableOpacity>
      </Card>

      <Button title="Sign out" variant="danger" onPress={handleLogout} loading={loggingOut} />
    </Screen>
  )
}
