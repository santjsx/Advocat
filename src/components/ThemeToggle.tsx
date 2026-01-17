import React, { useRef, useEffect } from 'react';
import { View, TouchableOpacity, Animated, StyleSheet } from 'react-native';

interface Props {
    value: boolean;
    onValueChange: (value: boolean) => void;
}

export const ThemeToggle: React.FC<Props> = ({ value, onValueChange }) => {
    const slideAnim = useRef(new Animated.Value(value ? 1 : 0)).current;

    useEffect(() => {
        Animated.spring(slideAnim, {
            toValue: value ? 1 : 0,
            useNativeDriver: true,
            tension: 50,
            friction: 8,
        }).start();
    }, [value, slideAnim]);

    const translateX = slideAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [3, 27],
    });

    const backgroundColor = slideAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['#f4f4f5', '#303136'],
    });

    // Sun glow opacity (visible when light mode)
    const sunOpacity = slideAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 0],
    });

    // Moon shadow opacity (visible when dark mode)
    const moonOpacity = slideAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
    });

    return (
        <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => onValueChange(!value)}
        >
            <Animated.View style={[styles.track, { backgroundColor }]}>
                <Animated.View
                    style={[
                        styles.thumb,
                        { transform: [{ translateX }] },
                    ]}
                >
                    {/* Sun gradient base */}
                    <Animated.View style={[styles.sunBase, { opacity: sunOpacity }]} />

                    {/* Moon base with crater effect */}
                    <Animated.View style={[styles.moonBase, { opacity: moonOpacity }]}>
                        <View style={styles.moonCrater} />
                    </Animated.View>
                </Animated.View>
            </Animated.View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    track: {
        width: 52,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        padding: 2,
    },
    thumb: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: 'transparent',
        overflow: 'hidden',
    },
    sunBase: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: 11,
        backgroundColor: '#ff8c00',
        shadowColor: '#ff0080',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 6,
        elevation: 4,
    },
    moonBase: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: 11,
        backgroundColor: '#c4d4e0',
        overflow: 'hidden',
    },
    moonCrater: {
        position: 'absolute',
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#303136',
        top: -4,
        right: -4,
    },
});
