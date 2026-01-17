
import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type ToastType = 'success' | 'error' | 'info';

interface ToastOptions {
    message: string;
    type?: ToastType;
    duration?: number;
}

interface ToastContextType {
    showToast: (options: ToastOptions) => void;
    hideToast: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { colors, layout, spacing } = useTheme();
    const insets = useSafeAreaInsets();

    // State
    const [visible, setVisible] = useState(false);
    const [message, setMessage] = useState('');
    const [type, setType] = useState<ToastType>('info');

    // Animation
    const opacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(20)).current;
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const showToast = useCallback(({ message, type = 'info', duration = 3000 }: ToastOptions) => {
        if (timerRef.current) clearTimeout(timerRef.current);

        setMessage(message);
        setType(type);
        setVisible(true);

        // Animate In
        Animated.parallel([
            Animated.timing(opacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.spring(translateY, {
                toValue: 0,
                friction: 8,
                useNativeDriver: true,
            })
        ]).start();

        // Auto Hide
        timerRef.current = setTimeout(() => {
            hideToast();
        }, duration);
    }, []);

    const hideToast = useCallback(() => {
        Animated.parallel([
            Animated.timing(opacity, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(translateY, {
                toValue: 20,
                duration: 300,
                useNativeDriver: true,
            })
        ]).start(() => {
            setVisible(false);
        });
    }, []);

    const getIconName = () => {
        switch (type) {
            case 'success': return 'check-circle';
            case 'error': return 'alert-circle';
            default: return 'information';
        }
    };

    const getToastStyle = () => {
        // Minimal clean look: dark background for light mode, slightly lighter for dark mode
        // Or accent color? User asked for "minimal and clean".
        // Let's stick to a neutral dark/black pill with status icon color.

        return {
            backgroundColor: colors.surfaceHighlight, // Or just strictly '#333' for consistency?
            borderColor: colors.border,
        };
    };

    const getIconColor = () => {
        switch (type) {
            case 'success': return colors.safe;
            case 'error': return colors.critical;
            default: return colors.accent;
        }
    };

    return (
        <ToastContext.Provider value={{ showToast, hideToast }}>
            {children}
            {visible && (
                <View style={[styles.container, { bottom: insets.bottom + 80 }]}>
                    <Animated.View
                        style={[
                            styles.toast,
                            {
                                opacity,
                                transform: [{ translateY }],
                                backgroundColor: colors.background === '#0A192F' ? '#1E2D45' : '#1A1A1A', // Specific dark background
                                borderColor: type === 'error' ? colors.critical : colors.border
                            }
                        ]}
                    >
                        <MaterialCommunityIcons
                            name={getIconName()}
                            size={20}
                            color={getIconColor()}
                            style={styles.icon}
                        />
                        <Text style={styles.message}>{message}</Text>
                    </Animated.View>
                </View>
            )}
        </ToastContext.Provider>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 9999,
        pointerEvents: 'none', // Allow passing touches through empty space
    },
    toast: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 30, // Pill shape
        minWidth: 200,
        maxWidth: '90%',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.30,
        shadowRadius: 4.65,
        elevation: 8,
        borderWidth: 1,
    },
    icon: {
        marginRight: 8,
    },
    message: {
        color: '#FFFFFF', // Always white text for contrast on dark pill
        fontSize: 14,
        fontWeight: '500',
    }
});
