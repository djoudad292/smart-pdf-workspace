import { useState, useCallback, useEffect } from 'react'
import { View, Text, FlatList, TouchableOpacity, Alert, RefreshControl } from 'react-native'
import { useRouter } from 'expo-router'
import * as DocumentPicker from 'expo-document-picker'
import { Ionicons } from '@expo/vector-icons'
import { Screen, Card, Badge, Spinner, EmptyState, Button } from '@/components/ui'
import { apiFetch, formatBytes, timeAgo, paginate } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { Colors } from '@/lib/theme'

export interface DocumentItem {
  id: string
  title: string
  sizeBytes: number
  pageCount: number
  status: string
  published: boolean
  summary?: string | null
  error?: string | null
  createdAt: string
}

export default function DocumentsScreen() {
  const router = useRouter()
  const { user, company } = useAuth()
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const data = await apiFetch('/documents')
      setDocuments(paginate<DocumentItem>(data).items)
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to load documents')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    load()
  }, [load])

  const upload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true })
      if (result.canceled || !result.assets?.length) return
      const asset = result.assets[0]
      setUploading(true)
      const form = new FormData()
      form.append('file', { uri: asset.uri, name: asset.name || 'document.pdf', type: asset.mimeType || 'application/pdf' } as any)
      const res = await apiFetch<DocumentItem>('/documents/upload', { method: 'POST', body: form })
      Alert.alert('Uploaded', res.status === 'failed' ? 'PDF uploaded but no readable text was extracted.' : 'PDF uploaded and processing started.')
      await load()
    } catch (err: any) {
      Alert.alert('Upload failed', err?.message || 'Something went wrong')
    } finally {
      setUploading(false)
    }
  }

  const togglePublish = async (doc: DocumentItem) => {
    setBusyId(doc.id)
    try {
      await apiFetch(`/documents/${doc.id}`, { method: 'PATCH', body: JSON.stringify({ published: !doc.published }) })
      await load()
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update document')
    } finally {
      setBusyId(null)
    }
  }

  const remove = (doc: DocumentItem) => {
    Alert.alert('Delete document', `Delete "${doc.title}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setBusyId(doc.id)
          try {
            await apiFetch(`/documents/${doc.id}`, { method: 'DELETE' })
            await load()
          } catch (err: any) {
            Alert.alert('Error', err?.message || 'Failed to delete document')
          } finally {
            setBusyId(null)
          }
        },
      },
    ])
  }

  const statusVariant = (status: string) => {
    if (status === 'ready') return 'green'
    if (status === 'processing') return 'orange'
    if (status === 'failed') return 'red'
    return 'slate'
  }

  const renderItem = ({ item }: { item: DocumentItem }) => (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: Colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
          <Ionicons name="document-text" size={20} color={Colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: Colors.foreground, fontSize: 15, fontWeight: '600' }} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={{ color: Colors.mutedForeground, fontSize: 12, marginTop: 2 }}>
            {formatBytes(item.sizeBytes)} · {item.pageCount} pages · {timeAgo(item.createdAt)}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <Badge text={item.status} variant={statusVariant(item.status)} />
            {item.published && <Badge text="published" variant="purple" />}
          </View>
          {item.error ? <Text style={{ color: Colors.red, fontSize: 12, marginTop: 6 }}>{item.error}</Text> : null}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            {item.status === 'ready' && (
              <TouchableOpacity
                onPress={() => togglePublish(item)}
                disabled={busyId === item.id}
                style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.muted }}
              >
                <Text style={{ color: item.published ? Colors.purple : Colors.foreground, fontSize: 12, fontWeight: '600' }}>
                  {item.published ? 'Unpublish' : 'Publish'}
                </Text>
              </TouchableOpacity>
            )}
            {item.status === 'ready' && (
              <TouchableOpacity
                onPress={() => router.push({ pathname: '/summary', params: { id: item.id, title: item.title } })}
                style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.muted }}
              >
                <Text style={{ color: Colors.primary, fontSize: 12, fontWeight: '600' }}>Summary</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => remove(item)}
              disabled={busyId === item.id}
              style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.redSoft }}
            >
              <Text style={{ color: Colors.red, fontSize: 12, fontWeight: '600' }}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Card>
  )

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <View>
          <Text style={{ color: Colors.foreground, fontSize: 20, fontWeight: '700' }}>Documents</Text>
          <Text style={{ color: Colors.mutedForeground, fontSize: 13, marginTop: 2 }}>
            {company?.name || user?.name} · {user?.email}
          </Text>
        </View>
      </View>

      <Button title={uploading ? 'Uploading…' : 'Upload PDF'} onPress={upload} loading={uploading} style={{ marginBottom: 16 }} />

      {loading ? (
        <Spinner label="Loading documents…" />
      ) : documents.length === 0 ? (
        <EmptyState
          icon={<Ionicons name="document-text-outline" size={40} color={Colors.mutedForeground} />}
          title="No documents yet"
          subtitle="Upload a PDF and it will be chunked and embedded automatically."
        />
      ) : (
        <FlatList
          data={documents}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      )}
    </Screen>
  )
}
