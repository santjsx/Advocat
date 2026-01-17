import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import * as Updates from 'expo-updates';
import { LinearGradient } from 'expo-linear-gradient';
import { GradientButton } from './GradientButton';
import { StatusBar } from 'expo-status-bar';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null
        };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    handleRestart = async () => {
        try {
            await Updates.reloadAsync();
        } catch (e) {
            // Fallback if Updates not available (e.g. dev mode)
            this.setState({ hasError: false, error: null, errorInfo: null });
        }
    };

    render() {
        if (this.state.hasError) {
            return (
                <View style={styles.container}>
                    <StatusBar style="light" />
                    <LinearGradient
                        colors={['#0f172a', '#1e293b']}
                        style={styles.background}
                    />

                    <View style={styles.content}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="warning-outline" size={60} color={colors.critical} />
                        </View>

                        <Text style={styles.title}>Something Went Wrong</Text>

                        <Text style={styles.message}>
                            We sincerely apologize for the inconvenience. Our team has been notified of this issue.
                        </Text>

                        <Text style={styles.devNote}>
                            "I'm truly sorry for this interruption. I'm working hard to ensure Advocat is 100% stable."
                            {'\n'}- Santhosh, Developer
                        </Text>

                        {/* Error Details (Collapsible or small) */}
                        <ScrollView style={styles.errorContainer} contentContainerStyle={styles.errorContent}>
                            <Text style={styles.errorLabel}>Technical Details:</Text>
                            <Text style={styles.errorText}>
                                {this.state.error && this.state.error.toString()}
                            </Text>
                        </ScrollView>

                        <View style={styles.buttonContainer}>
                            <GradientButton
                                title="Restart Application"
                                onPress={this.handleRestart}
                                style={{ width: '100%' }}
                            />
                        </View>
                    </View>
                </View>
            );
        }

        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0a0f',
        justifyContent: 'center',
    },
    background: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
    },
    content: {
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.3)',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#f8f8fc',
        marginBottom: 12,
        textAlign: 'center',
        letterSpacing: 0.5,
    },
    message: {
        fontSize: 16,
        color: '#9ca3af',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 24,
    },
    devNote: {
        fontSize: 14,
        color: '#64748b',
        fontStyle: 'italic',
        textAlign: 'center',
        marginBottom: 32,
        paddingHorizontal: 20,
        borderLeftWidth: 2,
        borderLeftColor: colors.accent,
        paddingLeft: 12,
    },
    errorContainer: {
        maxHeight: 120,
        width: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        borderRadius: 12,
        marginBottom: 32,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    errorContent: {
        padding: 16,
    },
    errorLabel: {
        color: '#64748b',
        fontSize: 12,
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    errorText: {
        color: '#ef4444',
        fontFamily: 'monospace',
        fontSize: 12,
    },
    buttonContainer: {
        width: '100%',
        paddingHorizontal: 16,
    },
});
