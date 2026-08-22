import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

interface ConfirmationModalProps {
    visible: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    type?: 'danger' | 'info' | 'warning';
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    visible,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    onConfirm,
    onCancel,
    type = 'danger'
}) => {
    const { colors, spacing, layout, mode } = useTheme();

    const getIcon = () => {
        switch (type) {
            case 'danger': return 'alert-circle-outline';
            case 'warning': return 'alert-outline';
            case 'info': return 'information-outline';
            default: return 'alert-circle-outline';
        }
    };

    const getColor = () => {
        switch (type) {
            case 'danger': return colors.critical;
            case 'warning': return colors.warning;
            case 'info': return colors.accent;
            default: return colors.critical;
        }
    };

    const styles = StyleSheet.create({
        overlay: {
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: spacing.l,
        },
        container: {
            backgroundColor: colors.surface,
            borderRadius: 24,
            padding: spacing.l,
            width: '100%',
            maxWidth: 340,
            alignItems: 'center',
            // Minimal shadow
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.1,
            shadowRadius: 20,
            elevation: 10,
        },
        iconContainer: {
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: getColor() + '15', // 10% opacity
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: spacing.m,
        },
        title: {
            color: colors.textPrimary,
            fontSize: 18,
            fontWeight: 'bold',
            textAlign: 'center',
            marginBottom: spacing.s,
        },
        message: {
            color: colors.textSecondary,
            fontSize: 14,
            textAlign: 'center',
            lineHeight: 20,
            marginBottom: spacing.l,
        },
        buttonRow: {
            flexDirection: 'row',
            width: '100%',
            gap: spacing.m,
        },
        button: {
            flex: 1,
            paddingVertical: 12,
            borderRadius: 12,
            justifyContent: 'center',
            alignItems: 'center',
        },
        cancelButton: {
            backgroundColor: colors.background,
            borderWidth: 1,
            borderColor: colors.border,
        },
        confirmButton: {
            backgroundColor: getColor(),
        },
        cancelText: {
            color: colors.textPrimary,
            fontSize: 15,
            fontWeight: '600',
        },
        confirmText: {
            color: '#FFFFFF',
            fontSize: 15,
            fontWeight: '600',
        },
    });

    return (
        <Modal
            visible={visible}
            transparent
            statusBarTranslucent
            animationType="fade"
            onRequestClose={onCancel}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.iconContainer}>
                        <MaterialCommunityIcons name={getIcon()} size={28} color={getColor()} />
                    </View>
                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.message}>{message}</Text>

                    <View style={styles.buttonRow}>
                        <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onCancel}>
                            <Text style={styles.cancelText}>{cancelText}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.button, styles.confirmButton]} onPress={onConfirm}>
                            <Text style={styles.confirmText}>{confirmText}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};
