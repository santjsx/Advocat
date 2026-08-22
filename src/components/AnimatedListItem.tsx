import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle, StyleProp } from 'react-native';

interface AnimatedListItemProps {
    children: React.ReactNode;
    index: number;
    style?: StyleProp<ViewStyle>;
}

/**
 * A senior-engineered wrapper component that adds a 60/120 FPS native spring entry animation to list items.
 * Uses native driver and capped staggered delay to prevent CPU spikes.
 */
const AnimatedListItemComponent: React.FC<AnimatedListItemProps> = ({
    children,
    index,
    style,
}) => {
    const opacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(8)).current;

    useEffect(() => {
        const delay = Math.min(index * 35, 220);

        const timer = setTimeout(() => {
            Animated.parallel([
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 180,
                    useNativeDriver: true,
                }),
                Animated.spring(translateY, {
                    toValue: 0,
                    tension: 260,
                    friction: 18,
                    useNativeDriver: true,
                }),
            ]).start();
        }, delay);

        return () => clearTimeout(timer);
    }, [index, opacity, translateY]);

    return (
        <Animated.View
            style={[
                style,
                {
                    opacity,
                    transform: [{ translateY }],
                },
            ]}
        >
            {children}
        </Animated.View>
    );
};

export const AnimatedListItem = React.memo(AnimatedListItemComponent);
