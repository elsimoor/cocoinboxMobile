
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewProps } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export const GradientBackground: React.FC<ViewProps> = ({ style, children }) => {
	const fade = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		Animated.loop(
			Animated.sequence([
				Animated.timing(fade, { toValue: 1, duration: 6000, useNativeDriver: true }),
				Animated.timing(fade, { toValue: 0, duration: 6000, useNativeDriver: true }),
			])
		).start();
	}, [fade]);

	const colorsA = ['#0ea5e9', '#22c55e', '#1e293b'] as const;
	const colorsB = ['#8b5cf6', '#06b6d4', '#0f172a'] as const;

	return (
		<View style={[styles.wrap, style]}>
			<LinearGradient
				colors={colorsA}
				start={{ x: 0.1, y: 0 }}
				end={{ x: 1, y: 1 }}
				style={styles.gradient}
			/>
			<Animated.View style={[StyleSheet.absoluteFillObject, { opacity: fade }]}> 
				<LinearGradient
					colors={colorsB}
					start={{ x: 0, y: 0 }}
					end={{ x: 1, y: 1 }}
					style={styles.gradient}
				/>
			</Animated.View>
			<View style={styles.overlay} />
			{children}
		</View>
	);
};

const styles = StyleSheet.create({
	wrap: { flex: 1 },
	gradient: { ...StyleSheet.absoluteFillObject, opacity: 0.28 },
	overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(244,244,245,0.3)' },
});

