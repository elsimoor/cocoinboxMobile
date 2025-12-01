import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

interface ToastProps {
  message: string;
  visible: boolean;
  onHide?: () => void;
  duration?: number; // ms
}

export const Toast: React.FC<ToastProps> = ({ message, visible, onHide, duration = 3000 }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const [render, setRender] = useState(visible);

  useEffect(() => {
    if (visible) {
      setRender(true);
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      const t = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }).start(({ finished }) => {
          if (finished) {
            setRender(false);
            onHide?.();
          }
        });
      }, duration);
      return () => clearTimeout(t);
    }
  }, [visible, duration, onHide, opacity]);

  if (!render) return null;
  return (
    <View style={styles.wrap} pointerEvents="none">
      <Animated.View style={[styles.toast, { opacity }]}> 
        <Text style={styles.text}>{message}</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 48, alignItems: 'center' },
  toast: { backgroundColor: '#0f172a', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 24, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
  text: { color: '#fff', fontWeight: '600' },
});

export default Toast;
