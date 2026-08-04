import { useState, useEffect, useCallback } from 'react'
import { View, Text, Alert } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Screen, Card, Button, Spinner } from '@/components/ui'
import { StackHeader } from '@/components/stack-header'
import { apiFetch } from '@/lib/api'
import { Colors } from '@/lib/theme'

export default function SummaryScreen() {
  const router = useRouter()
  const { id, title } = useLocalSearchParams<{ id: string; title: string }>()
  const [summary, setSummary] = useState('')
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  const generate = useCallback(
    async (force = false) => {
      if (!id) return
      setGenerating(true)
      try {
        const res = await apiFetch<{ summary: string; cached: boolean }>(`/documents/${id}/summarize`, {
          method: 'POST',
          body: JSON.stringify({ force }),
        })
        setSummary(res.summary)
      } catch (err: any) {
        Alert.alert('Error', err?.message || 'Failed to summarize')
      } finally {
        setGenerating(false)
        setLoading(false)
      }
    },
    [id]
  )

  useEffect(() => {
    if (id) {
      setLoading(true)
      generate(false)
    }
  }, [id, generate])

  return (
    <Screen>
      <StackHeader title={title || 'Summary'} onBack={() => router.back()} />

      {loading ? (
        <Spinner label="Generating summary…" />
      ) : (
        <Card>
          {summary ? (
            <Text style={{ color: Colors.foreground, fontSize: 14, lineHeight: 22 }}>{summary}</Text>
          ) : (
            <Text style={{ color: Colors.mutedForeground, fontSize: 14 }}>No summary could be generated.</Text>
          )}
          <View style={{ marginTop: 16 }}>
            <Button title="Regenerate" variant="outline" onPress={() => generate(true)} loading={generating} />
          </View>
        </Card>
      )}
    </Screen>
  )
}
