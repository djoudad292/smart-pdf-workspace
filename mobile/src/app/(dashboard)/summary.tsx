import { useState, useEffect, useCallback, useRef } from 'react'
import { View, Text, Alert } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Screen, Card, Button } from '@/components/ui'
import { StackHeader } from '@/components/stack-header'
import { MarkdownText } from '@/components/markdown'
import { apiFetch } from '@/lib/api'
import { Colors } from '@/lib/theme'

export default function SummaryScreen() {
  const router = useRouter()
  const { id, title } = useLocalSearchParams<{ id: string; title: string }>()
  const [summary, setSummary] = useState('')
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [revealed, setRevealed] = useState(0)
  const revealRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const reveal = useCallback((text: string) => {
    if (revealRef.current) clearInterval(revealRef.current)
    const words = text.split(' ')
    setRevealed(0)
    let n = 0
    revealRef.current = setInterval(() => {
      n += 2
      if (n >= words.length) {
        n = words.length
        if (revealRef.current) clearInterval(revealRef.current)
      }
      setRevealed(n)
    }, 24)
  }, [])

  useEffect(() => {
    return () => {
      if (revealRef.current) clearInterval(revealRef.current)
    }
  }, [])

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
        reveal(res.summary)
      } catch (err: any) {
        Alert.alert('Error', err?.message || 'Failed to summarize')
      } finally {
        setGenerating(false)
        setLoading(false)
      }
    },
    [id, reveal]
  )

  useEffect(() => {
    if (id) {
      setLoading(true)
      generate(false)
    }
  }, [id, generate])

  const done = revealed >= summary.split(' ').length

  return (
    <Screen>
      <StackHeader title={title || 'Summary'} onBack={() => router.back()} />

      {loading ? (
        <Card>
          <View style={{ alignItems: 'center', paddingVertical: 12 }}>
            <Ionicons name="sparkles" size={22} color={Colors.primary} />
            <View style={{ flexDirection: 'row', gap: 5, marginTop: 12 }}>
              {[0, 1, 2].map((i) => (
                <View
                  key={i}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: Colors.primary,
                    opacity: 0.5,
                  }}
                />
              ))}
            </View>
            <Text style={{ color: Colors.mutedForeground, fontSize: 13, marginTop: 10 }}>Reading the document and writing a summary…</Text>
          </View>
        </Card>
      ) : (
        <Card>
          {summary ? (
            <View>
              <MarkdownText>{summary.split(' ').slice(0, revealed).join(' ') + (done ? '' : ' ▍')}</MarkdownText>
              <View style={{ marginTop: 16 }}>
                <Button title="Regenerate" variant="outline" onPress={() => generate(true)} loading={generating} icon={<Ionicons name="refresh" size={16} color={Colors.foreground} />} />
              </View>
            </View>
          ) : (
            <Text style={{ color: Colors.mutedForeground, fontSize: 14 }}>No summary could be generated.</Text>
          )}
        </Card>
      )}
    </Screen>
  )
}
