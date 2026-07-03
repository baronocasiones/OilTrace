import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { Tabs } from 'expo-router';
import { BlurView } from 'expo-blur';
import { View, Text, Pressable, StyleSheet, Platform, LayoutChangeEvent } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, type SharedValue } from 'react-native-reanimated';
import { useTheme } from '../../theme/ThemeContext';

// ─── SVG Icon Components (design-system aesthetic, 1.75px stroke) ────────────────

interface IconProps {
  color: string;
  size?: number;
}

function HomeIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M9 22V12h6v10"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function HistoryIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle
        cx="12"
        cy="12"
        r="9"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 7v5l3 3"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function RewardsIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ProfileIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle
        cx="12"
        cy="7"
        r="4"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Map route names to icon components
const TAB_ICONS: Record<string, React.ComponentType<IconProps>> = {
  dashboard: HomeIcon,
  history: HistoryIcon,
  rewards: RewardsIcon,
  profile: ProfileIcon,
};

// ─── Tab Button (extracted for its own useAnimatedStyle hook) ─────────────────────

interface TabButtonProps {
  route: any;
  descriptors: any;
  navigation: any;
  index: number;
  activeIndex: number;
  pressedTabSV: SharedValue<number>;
  activeIndexSV: SharedValue<number>;
  accent: string;
  muted: string;
}

function TabButton({
  route,
  descriptors,
  navigation,
  index,
  activeIndex,
  pressedTabSV,
  activeIndexSV,
  accent,
  muted,
}: TabButtonProps) {
  const { options } = descriptors[route.key];
  const label =
    options.tabBarLabel !== undefined
      ? options.tabBarLabel
      : options.title !== undefined
        ? options.title
        : route.name;

  const isFocused = activeIndex === index;
  const IconComponent = TAB_ICONS[route.name] || HomeIcon;
  const color = isFocused ? accent : muted;

  // Animated style runs on UI thread — reads shared values, not state/props
  const animatedStyle = useAnimatedStyle(() => {
    const isPressed = pressedTabSV.value === index;
    const isActive = activeIndexSV.value === index;
    const target = isPressed ? 0.92 : isActive ? 1.08 : 1.0;
    return {
      transform: [{ scale: withSpring(target, { damping: 14, stiffness: 180 }) }],
    };
  });

  const handlePress = () => {
    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });
    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(route.name);
    }
  };

  const handleLongPress = () => {
    navigation.emit({ type: 'tabLongPress', target: route.key });
  };

  return (
    <Pressable
      key={route.key}
      onPress={handlePress}
      onLongPress={handleLongPress}
      onPressIn={() => { pressedTabSV.value = index; }}
      onPressOut={() => { pressedTabSV.value = -1; }}
      style={styles.tabButton}
    >
      <Animated.View style={[styles.tabInner, animatedStyle]}>
        <IconComponent color={color} size={22} />
        <Text
          style={[
            styles.labelText,
            {
              color,
              fontFamily: isFocused ? 'Inter-SemiBold' : 'Inter-Regular',
            },
          ]}
        >
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

// ─── Custom Tab Bar ──────────────────────────────────────────────────────────────

interface CustomTabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
}

function CustomTabBar({ state, descriptors, navigation }: CustomTabBarProps) {
  const { theme } = useTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const [tabBarWidth, setTabBarWidth] = useState(0);

  // Filter out hidden routes and dynamic routes to ensure only main tabs show up
  const visibleRoutes = useMemo(() => {
    const mainTabs = ['dashboard', 'history', 'rewards', 'profile'];
    return state.routes.filter((route: any) => mainTabs.includes(route.name));
  }, [state.routes]);

  // Determine the active index among visible tabs
  const activeIndex = useMemo(() => {
    const currentRouteName = state.routes[state.index].name;
    const idx = visibleRoutes.findIndex((r: any) => r.name === currentRouteName);
    if (idx !== -1) return idx;

    // Fallbacks for nested sub-routes that are hidden in the tab bar
    if (currentRouteName.startsWith('history')) {
      return 1; // History tab
    }
    if (currentRouteName.startsWith('profile')) {
      return 3; // Profile tab
    }
    return 0; // Default to Dashboard
  }, [visibleRoutes, state.index, state.routes]);

  // ── Reanimated shared values ────────────────────────────────────────────────

  const pillTranslateX = useSharedValue(0);
  const activeIndexSV = useSharedValue(0);
  const pressedTabSV = useSharedValue(-1);

  // Keep the shared value in sync with the active index
  useEffect(() => {
    activeIndexSV.value = activeIndex;
    if (tabBarWidth > 0 && activeIndex >= 0) {
      const tabWidth = tabBarWidth / visibleRoutes.length;
      pillTranslateX.value = activeIndex * tabWidth;
    }
  }, [activeIndex, tabBarWidth, visibleRoutes.length]);

  // Sliding pill animated style
  const pillAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: withSpring(pillTranslateX.value, { damping: 18, stiffness: 120 }) },
    ],
  }));

  // ── Layout measurements ─────────────────────────────────────────────────────

  const tabWidth =
    tabBarWidth > 0 ? tabBarWidth / visibleRoutes.length : 0;
  const pillWidth = tabWidth > 0 ? tabWidth - 16 : 0;
  const pillHeight = 44;

  const hexToRgba = (hex: string, opacity: number) => {
    const cleaned = hex.replace('#', '');
    const r = parseInt(cleaned.substring(0, 2), 16);
    const g = parseInt(cleaned.substring(2, 4), 16);
    const b = parseInt(cleaned.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };

  const activePillBg = hexToRgba(c.accent, 0.08);
  const activePillBorder = 'transparent';

  const containerStyle = [
    styles.container,
    {
      backgroundColor: Platform.OS === 'ios' ? 'transparent' : c.glassBg,
      borderTopColor: c.glassBorder,
      height: 64 + insets.bottom,
      paddingBottom: insets.bottom,
    },
  ];

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    setTabBarWidth(e.nativeEvent.layout.width);
  }, []);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <View style={containerStyle} onLayout={onLayout}>
      {Platform.OS === 'ios' && (
        <BlurView
          tint={theme.mode === 'light' ? 'light' : 'dark'}
          intensity={80}
          style={StyleSheet.absoluteFill}
        />
      )}

      {/* Sliding pill indicator (Reanimated spring) */}
      {tabBarWidth > 0 && tabWidth > 0 && (
        <Animated.View
          style={[
            styles.pill,
            {
              width: pillWidth,
              height: pillHeight,
              left: 8,
              backgroundColor: activePillBg,
              borderColor: activePillBorder,
              shadowColor: c.accent,
            },
            pillAnimatedStyle,
          ]}
        />
      )}

      {visibleRoutes.map((route: any, index: number) => (
        <TabButton
          key={route.key}
          route={route}
          descriptors={descriptors}
          navigation={navigation}
          index={index}
          activeIndex={activeIndex}
          pressedTabSV={pressedTabSV}
          activeIndexSV={activeIndexSV}
          accent={c.accent}
          muted={c.muted}
        />
      ))}
    </View>
  );
}

// ─── Screen Configuration ────────────────────────────────────────────────────────

export default function ConsumerLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tabs.Screen name="dashboard" options={{ title: 'Dashboard' }} />
      <Tabs.Screen name="history" options={{ title: 'History' }} />
      <Tabs.Screen name="rewards" options={{ title: 'Rewards' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      <Tabs.Screen name="history/[id]" options={{ href: null }} />
      <Tabs.Screen name="profile/edit-business" options={{ href: null }} />
      <Tabs.Screen name="profile/edit-account" options={{ href: null }} />
    </Tabs>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    elevation: 0,
    borderTopWidth: 1,
    alignItems: 'center',
    justifyContent: 'space-around',
    overflow: 'hidden',
    zIndex: 10,
  },
  pill: {
    position: 'absolute',
    top: 10,
    borderRadius: 22,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 64,
  },
  tabInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelText: {
    fontSize: 10,
    marginTop: 2,
  },
});
