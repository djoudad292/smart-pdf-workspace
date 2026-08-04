import { useState } from 'react'
import { View, Text } from 'react-native'
import { useRouter } from 'expo-router'
import { Screen, Field, Button, ErrorText } from '@/components/ui'
import { StackHeader } from '@/components/stack-header'
import { apiFetch } from '@/lib/api'
import { Colors } from '@/lib/theme'

export default function ForgotPasswordScreen() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async () => {
    setError('')
    setLoading(true)
    try {
      await apiFetch('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email: email.trim() }) })
      setSent(true)
    } catch (err: any) {
      setError(err?.message || 'Failed to send reset email')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Screen>
      <StackHeader title="Reset password" onBack={() => router.back()} />
      <View style={{ flex: 1, justifyContent: 'center', maxWidth: 400, width: '100%', alignSelf: 'center' }}>
        {sent ? (
          <View style={{ backgroundColor: Colors.greenSoft, borderRadius: 12, padding: 16 }}>
            <Text style={{ color: Colors.green, fontSize: 14 }}>
              If an account exists for {email}, a reset link has been sent. Check your inbox.
            </Text>
          </View>
        ) : (
          <>
            <ErrorText message={error} />
            <Field
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@company.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Button title="Send reset link" onPress={handleSubmit} loading={loading} />
          </>
        )}
      </View>
    </Screen>
  )
}
