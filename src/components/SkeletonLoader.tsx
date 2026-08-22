import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle, StyleProp, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface SkeletonProps {
    width?: number | `${number}%` | 'auto';
    height?: number;
    borderRadius?: number;
    style?: StyleProp<ViewStyle>;
}

/**
 * Shimmering skeleton loader with native opacity pulse animation for fast perceived loading.
 */
export const SkeletonLoader: React.FC<SkeletonProps> = ({
    width = '100%',
    height = 20,
    borderRadius = 8,
    style,
}) => {
    const { colors, mode } = useTheme();
    const pulseAnim = useRef(new Animated.Value(0.35)).current;

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 0.85,
                    duration: 750,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 0.35,
                    duration: 750,
                    useNativeDriver: true,
                }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, [pulseAnim]);

    const baseColor = mode === 'dark' ? colors.surfaceHighlight : '#e2e8f0';

    return (
        <Animated.View
            style={[
                styles.skeleton,
                {
                    width: width as any,
                    height,
                    borderRadius,
                    backgroundColor: baseColor,
                    opacity: pulseAnim,
                },
                style,
            ]}
        />
    );
};

const styles = StyleSheet.create({
    skeleton: {
        overflow: 'hidden',
    },
});
