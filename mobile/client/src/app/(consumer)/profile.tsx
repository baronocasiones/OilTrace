import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { createGlobalStyles } from '../../theme/globalStyles';
import { Heading, BodyText } from '../../components/ui/Typography';

export default function ProfileScreen() {
  const { theme } = useTheme();
  const g = createGlobalStyles(theme);

  return (
    <View style={[g.screenBg, styles.container]}>
      <Heading size="lg">My Profile</Heading>
      <BodyText style={styles.text}>This screen will show your business profile, settings, and role switcher configuration.</BodyText>
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
