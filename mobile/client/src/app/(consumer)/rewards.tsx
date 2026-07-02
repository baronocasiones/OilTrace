import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { createGlobalStyles } from '../../theme/globalStyles';
import { Heading, BodyText } from '../../components/ui/Typography';

export default function RewardsScreen() {
  const { theme } = useTheme();
  const g = createGlobalStyles(theme);

  return (
    <View style={[g.screenBg, styles.container]}>
      <Heading size="lg" style={g.textGold}>My Rewards</Heading>
      <BodyText style={styles.text}>Here you will be able to browse partner stores, view active vouchers, and redeem points.</BodyText>
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
