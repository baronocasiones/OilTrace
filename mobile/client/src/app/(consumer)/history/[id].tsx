import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../../../theme/ThemeContext';
import { createGlobalStyles } from '../../../theme/globalStyles';
import { Heading, BodyText } from '../../../components/ui/Typography';
import { Button } from '../../../components/ui/Button';

export default function HistoryDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { theme } = useTheme();
  const g = createGlobalStyles(theme);

  return (
    <View style={[g.screenBg, styles.container]}>
      <Heading size="lg" style={g.textAccent}>Collection Details</Heading>
      <BodyText style={styles.text}>Viewing transaction hash and verification logs for ID: {id}</BodyText>
      <Button variant="glass" style={styles.btn} onPress={() => router.back()}>
        Go Back
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    marginTop: 12,
    marginBottom: 24,
    textAlign: 'center',
  },
  btn: {
    marginTop: 12,
  },
});
