import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { createGlobalStyles } from '../../theme/globalStyles';
import { Heading, BodyText } from '../../components/ui/Typography';

export default function HistoryScreen() {
  const { theme } = useTheme();
  const g = createGlobalStyles(theme);

  return (
    <View style={[g.screenBg, styles.container]}>
      <Heading size="lg" style={g.textAccent}>Collection History</Heading>
      <BodyText style={styles.text}>This screen will list your past oil collection records and blockchain transaction logs.</BodyText>
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
    textAlign: 'center',
  },
});
