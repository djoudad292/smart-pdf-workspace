import { View, Text } from 'react-native'
import { useRouter } from 'expo-router'
import { Screen, Card } from '@/components/ui'
import { StackHeader } from '@/components/stack-header'
import { useAuth } from '@/lib/auth-context'
import { getApiUrl } from '@/lib/api'
import { Colors } from '@/lib/theme'

const WIDGET_JS_URL = process.env.EXPO_PUBLIC_WIDGET_URL || 'https://docs.djaouad.tech/widget.js'

export default function GuideScreen() {
  const router = useRouter()
  const { company } = useAuth()
  const companyId = company?.id || 'YOUR_COMPANY_ID'
  const apiUrl = getApiUrl()
  const snippet = `<script src="${WIDGET_JS_URL}" data-company-id="${companyId}"></script>`

  return (
    <Screen scroll>
      <StackHeader title="Widget embed guide" onBack={() => router.back()} />

      <Card>
        <Text style={{ color: Colors.foreground, fontSize: 15, fontWeight: '700', marginBottom: 8 }}>Install the widget</Text>
        <Text style={{ color: Colors.mutedForeground, fontSize: 14, lineHeight: 20, marginBottom: 12 }}>
          Paste this one line anywhere in your website&apos;s body. Visitors will see a floating assistant that answers
          from your published documents.
        </Text>
        <View style={{ backgroundColor: Colors.secondary, borderRadius: 12, padding: 14 }}>
          <Text selectable style={{ color: Colors.foreground, fontSize: 12, fontFamily: 'monospace', lineHeight: 18 }}>
            {snippet}
          </Text>
        </View>
      </Card>

      <Card>
        <Text style={{ color: Colors.foreground, fontSize: 15, fontWeight: '700', marginBottom: 8 }}>Requirements</Text>
        <Text style={{ color: Colors.mutedForeground, fontSize: 13, lineHeight: 20 }}>
          • At least one document must be published (Documents tab).{'\n'}
          • The widget loads config from {apiUrl}/widget/{companyId}/config{'\n'}
          • Answers are grounded only in your published documents.
        </Text>
      </Card>

      <Card>
        <Text style={{ color: Colors.foreground, fontSize: 15, fontWeight: '700', marginBottom: 8 }}>How it works</Text>
        <Text style={{ color: Colors.mutedForeground, fontSize: 13, lineHeight: 20 }}>
          1. The snippet loads {WIDGET_JS_URL}, a small dependency-free script.{'\n'}
          2. It fetches the widget config and published-document list from the backend.{'\n'}
          3. Visitor questions go to POST /widget/ask and the answer renders with sources.{'\n'}
          4. Styling (title, color, position) comes from your Settings tab.
        </Text>
      </Card>
    </Screen>
  )
}
