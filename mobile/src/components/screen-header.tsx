import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '@/lib/theme'

export function ScreenHeader({
  title,
  subtitle,
  icon,
}: {
  title: string
  subtitle?: string
  icon?: keyof typeof Ionicons.glyphMap
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.brand}>
        <View style={styles.logo}>
          <Ionicons name={icon || 'document-text'} size={18} color={Colors.primaryForeground} />
        </View>
        <View style={styles.texts}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 16,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: { flex: 1 },
  title: {
    color: Colors.foreground,
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    color: Colors.mutedForeground,
    fontSize: 13,
    marginTop: 2,
  },
})
