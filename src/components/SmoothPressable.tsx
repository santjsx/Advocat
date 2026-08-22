import React, { useRef } from 'react';
import {
    Animated,
    TouchableWithoutFeedback,
    StyleProp,
    ViewStyle,
    Insets,
    AccessibilityRole,
} from 'react-native';
import * as Haptics from 'expo-haptics';

export type HapticTier = 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning' | 'none';

interface SmoothPressableProps {
    children: React.ReactNode;
    onPress?: () => void;
    onLongPress?: () => void;
    style?: StyleProp<ViewStyle>;
    scaleTo?: number;
    activeOpacity?: number;
    haptic?: HapticTier;
    disabled?: boolean;
    hitSlop?: Insets | number;
    accessibilityLabel?: string;
    accessibilityRole?: AccessibilityRole;
    testID?: string;
}

/**
 * Ultra-smooth physics-based interactive wrapper with 60/120 FPS native spring compression,
 * zero JS-thread latency, and tiered haptic feedback.
 */
export const SmoothPressable: React.FC<SmoothPressableProps> = ({
    children,
    onPress,
    onLongPress,
    style,
    scaleTo = 0.965,
    activeOpacity = 0.88,
    haptic = 'light',
    disabled = false,
    hitSlop,
    accessibilityLabel,
    accessibilityRole = 'button',
    testID,
}) => {
    const scale = useRef(new Animated.Value(1)).current;
    const opacity = useRef(new Animated.Value(1)).current;

    const triggerHaptic = () => {
        if (haptic === 'none') return;
        switch (haptic) {
            case 'light':
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                break;
            case 'medium':
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                break;
            case 'heavy':
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                break;
            case 'selection':
                Haptics.selectionAsync();
                break;
            case 'success':
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                break;
            case 'warning':
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                break;
            default:
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
    };

    const handlePressIn = () => {
        if (disabled) return;
        triggerHaptic();

        Animated.parallel([
            Animated.spring(scale, {
                toValue: scaleTo,
                tension: 340,
                friction: 22,
                useNativeDriver: true,
            }),
            Animated.timing(opacity, {
                toValue: activeOpacity,
                duration: 90,
                useNativeDriver: true,
            }),
        ]).start();
    };

    const handlePressOut = () => {
        if (disabled) return;

        Animated.parallel([
            Animated.spring(scale, {
                toValue: 1,
                tension: 300,
                friction: 18,
                useNativeDriver: true,
            }),
            Animated.timing(opacity, {
                toValue: 1,
                duration: 140,
                useNativeDriver: true,
            }),
        ]).start();
    };

    const computedHitSlop = typeof hitSlop === 'number'
        ? { top: hitSlop, bottom: hitSlop, left: hitSlop, right: hitSlop }
        : hitSlop;

    return (
        <TouchableWithoutFeedback
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onPress={onPress}
            onLongPress={onLongPress}
            disabled={disabled}
            hitSlop={computedHitSlop}
            accessibilityLabel={accessibilityLabel}
            accessibilityRole={accessibilityRole}
            testID={testID}
        >
            <Animated.View
                style={[
                    style,
                    {
                        transform: [{ scale }],
                        opacity: disabled ? 0.5 : opacity,
                    },
                ]}
            >
                {children}
            </Animated.View>
        </TouchableWithoutFeedback>
    );
};
