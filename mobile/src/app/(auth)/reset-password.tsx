import { useState, useEffect } from 'react'
import { View, Text } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Screen, Field, Button, ErrorText } from '@/components/ui'
import { StackHeader } from '@/components/stack-header'
import { apiFetch } from '@/lib/api'
import { Colors } from '@/lib/theme'

export default function ResetPasswordScreen() {
  const router = useRouter()
  const { token } = useLocalSearchParams<{ token: string }>()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!token) {
      setError('Missing reset token')
    }
  }, [token])

  const handleSubmit = async () => {
    setError('')
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    setLoading(true)
    try {
      await apiFetch('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, newPassword: password }) })
      setDone(true)
    } catch (err: any) {
      setError(err?.message || 'Failed to reset password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Screen>
      <StackHeader title="New password" onBack={() => router.back()} />
      <View style={{ flex: 1, justifyContent: 'center', maxWidth: 400, width: '100%', alignSelf: 'center' }}>
        {done ? (
          <View style={{ backgroundColor: Colors.greenSoft, borderRadius: 12, padding: 16 }}>
            <Text style={{ color: Colors.green, fontSize: 14 }}>Password updated successfully.</Text>
          </View>
        ) : (
          <>
            <ErrorText message={error} />
            <Field label="New password" value={password} onChangeText={setPassword} placeholder="At least 8 characters" secureTextEntry />
            <Button title="Update password" onPress={handleSubmit} loading={loading} disabled={!token} />
          </>
        )}
      </View>
    </Screen>
  )
}
