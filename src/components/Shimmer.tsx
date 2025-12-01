import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';

interface Props { width?: DimensionValue; height?: number; rounded?: boolean; style?: StyleProp<ViewStyle> }

export const Shimmer: React.FC<Props> = ({ width = '100%', height = 14, rounded = true, style }) => {
  const translate = useRef(new Animated.Value(-100)).current;
  useEffect(() => {
    Animated.loop(Animated.timing(translate, { toValue: 200, duration: 1400, useNativeDriver: true })).start();
  }, [translate]);
  return (
    <View style={[styles.container, rounded && { borderRadius: 8 }, { width, height }, style]}>
      <Animated.View style={[styles.shine, { transform: [{ translateX: translate }] }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { backgroundColor: 'rgba(226,232,240,0.8)', overflow: 'hidden' },
  shine: { height: '100%', width: 80, backgroundColor: 'rgba(255,255,255,0.7)', opacity: 0.7 },
});
