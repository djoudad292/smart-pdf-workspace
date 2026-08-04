import { useState, useCallback, useEffect } from 'react'
import { View, Text, FlatList, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Screen, Spinner, EmptyState } from '@/components/ui'
import { apiFetch, paginate } from '@/lib/api'
import type { DocumentItem } from './index'
import { Colors } from '@/lib/theme'

interface Source {
  id: string
  chunkText: string
  similarity: number
}

interface AskResult {
  answer: string
  sources: Source[]
}

interface Message {
  role: 'user' | 'assistant'
  text: string
}

export default function AskScreen() {
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState('')
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [asking, setAsking] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await apiFetch('/documents')
      const ready = paginate<DocumentItem>(data).items.filter((d) => d.status === 'ready')
      setDocuments(ready)
      if (ready.length === 1 && !selectedId) setSelectedId(ready[0].id)
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to load documents')
    } finally {
      setLoading(false)
    }
  }, [selectedId])

  useEffect(() => {
    load()
  }, [load])

  const ask = async () => {
    const q = question.trim()
    if (!selectedId) {
      Alert.alert('Select a document', 'Pick a ready document before asking.')
      return
    }
    if (!q) return
    setMessages((prev) => [...prev, { role: 'user', text: q }])
    setQuestion('')
    setAsking(true)
    try {
      const result = await apiFetch<AskResult>(`/documents/${selectedId}/ask`, {
        method: 'POST',
        body: JSON.stringify({ question: q }),
      })
      setMessages((prev) => [...prev, { role: 'assistant', text: result.answer }])
    } catch (err: any) {
      setMessages((prev) => [...prev, { role: 'assistant', text: `Error: ${err?.message || 'Something went wrong'}` }])
    } finally {
      setAsking(false)
    }
  }

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={{ alignSelf: item.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%', marginBottom: 10 }}>
      <View
        style={{
          backgroundColor: item.role === 'user' ? Colors.primary : Colors.muted,
          borderRadius: 16,
          borderBottomRightRadius: item.role === 'user' ? 4 : 16,
          borderBottomLeftRadius: item.role === 'user' ? 16 : 4,
          paddingHorizontal: 14,
          paddingVertical: 10,
        }}
      >
        <Text style={{ color: item.role === 'user' ? Colors.primaryForeground : Colors.foreground, fontSize: 14, lineHeight: 20 }}>
          {item.text}
        </Text>
      </View>
    </View>
  )

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: Colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <Text style={{ color: Colors.foreground, fontSize: 20, fontWeight: '700', marginBottom: 12 }}>Ask a document</Text>

        {loading ? (
          <Spinner label="Loading documents…" />
        ) : documents.length === 0 ? (
          <EmptyState
            icon={<Ionicons name="chatbubble-ellipses-outline" size={40} color={Colors.mutedForeground} />}
            title="Nothing to ask yet"
            subtitle="Upload and process a PDF first — questions will be answered from its content."
          />
        ) : (
          <>
            <Text style={{ color: Colors.mutedForeground, fontSize: 13, marginBottom: 6 }}>Document</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {documents.map((doc) => (
                <TouchableOpacity
                  key={doc.id}
                  onPress={() => setSelectedId(doc.id)}
                  style={{
                    borderWidth: 1,
                    borderColor: selectedId === doc.id ? Colors.primary : Colors.border,
                    backgroundColor: selectedId === doc.id ? Colors.primarySoft : Colors.muted,
                    borderRadius: 999,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                  }}
                >
                  <Text
                    style={{ color: selectedId === doc.id ? Colors.primary : Colors.mutedForeground, fontSize: 12, fontWeight: '600' }}
                    numberOfLines={1}
                  >
                    {doc.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <FlatList
              data={messages}
              keyExtractor={(_, i) => String(i)}
              renderItem={renderMessage}
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingBottom: 12 }}
              ListEmptyComponent={
                <Text style={{ color: Colors.mutedForeground, fontSize: 13, textAlign: 'center', marginTop: 24 }}>
                  Ask a question and the answer (with sources) will appear here.
                </Text>
              }
            />

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 8 }}>
              <TextInput
                value={question}
                onChangeText={setQuestion}
                placeholder="Ask a question…"
                placeholderTextColor={Colors.mutedForeground}
                style={{
                  flex: 1,
                  backgroundColor: Colors.muted,
                  borderWidth: 1,
                  borderColor: Colors.border,
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  color: Colors.foreground,
                  fontSize: 15,
                }}
                returnKeyType="send"
                onSubmitEditing={ask}
              />
              <TouchableOpacity
                onPress={ask}
                disabled={asking}
                style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', opacity: asking ? 0.5 : 1 }}
              >
                <Ionicons name="arrow-up" size={20} color={Colors.primaryForeground} />
              </TouchableOpacity>
            </View>
          </>
        )}
      </Screen>
    </KeyboardAvoidingView>
  )
}
