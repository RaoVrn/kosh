import { StatusBar } from 'expo-status-bar'
import { StyleSheet, Text, View } from 'react-native'
import { colors } from './src/theme'

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Kosh</Text>
      <Text style={styles.subtitle}>Capture everything. Forget nothing.</Text>
      <StatusBar style="light" />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: colors.text,
    fontSize: 40,
    fontWeight: '700',
    letterSpacing: 1,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 16,
    marginTop: 8,
  },
})
