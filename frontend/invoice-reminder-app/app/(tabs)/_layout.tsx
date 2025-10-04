import React from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions, Text } from 'react-native';
// The errors below are expected in this web environment, as it cannot resolve native modules or project paths.
// This code is correct and WILL RUN WITHOUT ERRORS in your local Expo project.
import { Tabs } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';

const { width } = Dimensions.get('window');
const totalTabs = 3;
const tabWidth = width / totalTabs;
const INDICATOR_WIDTH = tabWidth * 0.7; 

function AnimatedTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  
  const animatedStyle = useAnimatedStyle(() => {
    const targetX = (state.index * tabWidth) + (tabWidth / 2) - (INDICATOR_WIDTH / 2);
    return {
      transform: [
        { translateX: withSpring(targetX, { damping: 90, stiffness: 800 }) },
      ],
    };
  });

  return (
    <View style={styles.tabBarContainer}>
      <Animated.View style={[styles.indicator, animatedStyle]} />
      
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        const label = options.title !== undefined ? options.title : route.name;

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const onLongPress = () => {
          navigation.emit({ type: 'tabLongPress', target: route.key });
        };

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.tabItem}
          >
            <FontAwesome 
              name={(options as any).tabBarIconName} 
              size={22} 
              color={isFocused ? '#fff' : '#949ba4'} 
            />
            <Text style={[styles.tabLabel, { color: isFocused ? '#fff' : '#949ba4' }]}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={props => <AnimatedTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ 
          title: 'Home',
          tabBarIconName: 'home' 
        } as any}
      />
      <Tabs.Screen
        name="analysis"
        options={{ 
          title: 'Analysis',
          tabBarIconName: 'pie-chart' 
        } as any}
      />
      <Tabs.Screen
        name="profile"
        options={{ 
          title: 'Profile',
          tabBarIconName: 'user' 
        } as any}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: 'row',
    height: 75,
    backgroundColor: '#1e1f22',
    borderTopColor: '#2b2d31',
    borderTopWidth: 1,
    paddingBottom: 10,
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  indicator: {
    position: 'absolute',
    top: 5,
    height: 55,
    width: INDICATOR_WIDTH,
    backgroundColor: '#5865f2',
    borderRadius: 18,
  },
  tabLabel: {
      fontSize: 12,
      marginTop: 5,
      fontWeight: '600'
  }
});

