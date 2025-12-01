import React, { useRef } from 'react';
import { Pressable, Text, ViewStyle, StyleSheet, Animated, GestureResponderEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface Props {
  title: string;
  onPress?: (event: GestureResponderEvent) => void;
  disabled?: boolean;
  style?: ViewStyle | ViewStyle[];
}

export const GradientButton: React.FC<Props> = ({ title, onPress, disabled, style }) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handleIn = () => Animated.spring(scale, { toValue: 0.98, useNativeDriver: true }).start();
  const handleOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}> 
      <Pressable onPress={onPress} disabled={disabled} onPressIn={handleIn} onPressOut={handleOut}>
        <LinearGradient
          colors={['#0ea5e9', '#6366f1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.btn, disabled && { opacity: 0.6 }]}
        >
          <Text style={styles.text}>{title}</Text>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  btn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', shadowColor: '#6366f1', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 5 },
  text: { color: '#fff', fontWeight: '700' },
});
