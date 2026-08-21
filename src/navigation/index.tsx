import React from 'react';
import { Platform } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme, Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';

import { DashboardScreen } from '../screens/DashboardScreen';
import { CaseListScreen } from '../screens/CaseListScreen';
import { CaseDetailScreen } from '../screens/CaseDetailScreen';
import { AddCaseScreen } from '../screens/AddCaseScreen';
import { EditCaseScreen } from '../screens/EditCaseScreen';
import { AddDeadlineScreen } from '../screens/AddDeadlineScreen';
import { EditDeadlineScreen } from '../screens/EditDeadlineScreen';
import { AllDeadlinesScreen } from '../screens/AllDeadlinesScreen';
import { ResearchScreen } from '../screens/ResearchScreen';
import { AnalyticsScreen } from '../screens/AnalyticsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { AddDocumentScreen } from '../screens/AddDocumentScreen';
import { DocumentDetailScreen } from '../screens/DocumentDetailScreen';
import { PrivacyPolicyScreen } from '../screens/PrivacyPolicyScreen';
import { HelpScreen } from '../screens/HelpScreen';
import { RootStackParamList, MainTabParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const MainTabs = () => {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const safeBottom = Math.max(insets.bottom, Platform.OS === 'android' ? 12 : 8);

    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: colors.surface,
                    borderTopColor: colors.border,
                    borderTopWidth: 1,
                    // Dynamic height: Content height (56) + safe bottom insets
                    height: 56 + safeBottom,
                    paddingBottom: safeBottom,
                    paddingTop: 6,
                },
                tabBarActiveTintColor: colors.accent,
                tabBarInactiveTintColor: colors.textMuted,
                tabBarLabelStyle: {
                    fontSize: 10,
                    fontWeight: '600',
                    marginTop: 2,
                    letterSpacing: 0.3,
                },
            }}
        >
            <Tab.Screen
                name="Dashboard"
                component={DashboardScreen}
                options={{
                    tabBarLabel: 'Home',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="home-outline" size={size} color={color} />
                    ),
                }}
            />
            <Tab.Screen
                name="Cases"
                component={CaseListScreen}
                options={{
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="briefcase-outline" size={size} color={color} />
                    ),
                }}
            />
            <Tab.Screen
                name="Deadlines"
                component={AllDeadlinesScreen}
                options={{
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="clock-outline" size={size} color={color} />
                    ),
                }}
            />
            <Tab.Screen
                name="Research"
                component={ResearchScreen}
                options={{
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="scale-balance" size={size} color={color} />
                    ),
                }}
            />
            <Tab.Screen
                name="Analytics"
                component={AnalyticsScreen}
                options={{
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="chart-bar" size={size} color={color} />
                    ),
                }}
            />
            <Tab.Screen
                name="Settings"
                component={SettingsScreen}
                options={{
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="cog-outline" size={size} color={color} />
                    ),
                }}
            />
        </Tab.Navigator>
    );
};

export const RootNavigator = () => {
    const { colors, mode } = useTheme();

    const navTheme: Theme = {
        dark: mode === 'dark',
        colors: {
            primary: colors.accent,
            background: colors.background,
            card: colors.surface,
            text: colors.textPrimary,
            border: colors.border,
            notification: colors.critical,
        },
        fonts: DefaultTheme.fonts,
    };

    return (
        <NavigationContainer theme={navTheme}>
            <Stack.Navigator
                screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: colors.background },
                    animation: 'slide_from_right',
                    gestureEnabled: true,
                }}
                initialRouteName="MainTabs"
            >
                <Stack.Screen name="MainTabs" component={MainTabs} />
                <Stack.Screen
                    name="CaseDetail"
                    component={CaseDetailScreen}
                    options={{ presentation: 'card' }}
                />
                <Stack.Screen
                    name="AddCase"
                    component={AddCaseScreen}
                    options={{ presentation: 'modal' }}
                />
                <Stack.Screen
                    name="EditCase"
                    component={EditCaseScreen}
                    options={{ presentation: 'modal' }}
                />
                <Stack.Screen
                    name="AddDeadline"
                    component={AddDeadlineScreen}
                    options={{ presentation: 'modal' }}
                />
                <Stack.Screen
                    name="EditDeadline"
                    component={EditDeadlineScreen}
                    options={{ presentation: 'modal' }}
                />
                <Stack.Screen
                    name="Notifications"
                    component={NotificationsScreen}
                    options={{ presentation: 'modal' }}
                />
                <Stack.Screen
                    name="AddDocument"
                    component={AddDocumentScreen}
                    options={{ presentation: 'modal' }}
                />
                <Stack.Screen
                    name="DocumentDetail"
                    component={DocumentDetailScreen}
                    options={{ presentation: 'card' }}
                />
                <Stack.Screen
                    name="PrivacyPolicy"
                    component={PrivacyPolicyScreen}
                    options={{ title: 'Privacy Policy' }}
                />
                <Stack.Screen
                    name="Help"
                    component={HelpScreen}
                    options={{ title: 'User Guide' }}
                />
            </Stack.Navigator>
        </NavigationContainer>
    );
};
