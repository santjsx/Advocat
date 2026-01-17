import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle } from 'react-native';

interface AnimatedListItemProps {
    children: React.ReactNode;
    index: number;
    style?: ViewStyle;
}

/**
 * A wrapper component that adds a subtle fade-in animation to list items.
 * Use this to make lists feel more premium and polished.
 */
export const AnimatedListItem: React.FC<AnimatedListItemProps> = ({
    children,
    index,
    style
}) => {
    const opacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(10)).current;

    useEffect(() => {
        // Stagger animation based on index (max 300ms delay)
        const delay = Math.min(index * 50, 300);

        Animated.parallel([
            Animated.timing(opacity, {
                toValue: 1,
                duration: 200,
                delay,
                useNativeDriver: true,
            }),
            Animated.timing(translateY, {
                toValue: 0,
                duration: 200,
                delay,
                useNativeDriver: true,
            }),
        ]).start();
    }, [index]);

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
