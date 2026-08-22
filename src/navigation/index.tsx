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
import { ImageToPdfScreen } from '../screens/ImageToPdfScreen';
import { RootStackParamList, MainTabParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

import * as Haptics from 'expo-haptics';

const MainTabs = () => {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    
    // Provide generous breathing room on Android (especially 3-button navbar mode) and iOS
    const safeBottom = insets.bottom > 0 
        ? insets.bottom + 6 
        : (Platform.OS === 'android' ? 16 : 8);

    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                sceneStyle: { backgroundColor: colors.background },
                tabBarStyle: {
                    backgroundColor: colors.surface,
                    borderTopColor: colors.border,
                    borderTopWidth: 1,
                    height: (Platform.OS === 'android' ? 64 : 58) + safeBottom,
                    paddingBottom: safeBottom,
                    paddingTop: 8,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: -2 },
                    shadowOpacity: 0.06,
                    shadowRadius: 8,
                    elevation: 8,
                },
                tabBarActiveTintColor: colors.accent,
                tabBarInactiveTintColor: colors.textMuted,
                tabBarLabelStyle: {
                    fontSize: 10.5,
                    fontWeight: '700',
                    marginTop: 3,
                    marginBottom: 2,
                    letterSpacing: 0.3,
                },
            }}
            screenListeners={{
                tabPress: () => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                },
            }}
        >
            <Tab.Screen
                name="Dashboard"
                component={DashboardScreen}
                options={{
                    tabBarLabel: 'Home',
                    tabBarIcon: ({ color, size, focused }) => (
                        <MaterialCommunityIcons name={focused ? "home" : "home-outline"} size={size + (focused ? 2 : 0)} color={color} />
                    ),
                }}
            />
            <Tab.Screen
                name="Cases"
                component={CaseListScreen}
                options={{
                    tabBarIcon: ({ color, size, focused }) => (
                        <MaterialCommunityIcons name={focused ? "briefcase" : "briefcase-outline"} size={size + (focused ? 2 : 0)} color={color} />
                    ),
                }}
            />
            <Tab.Screen
                name="Deadlines"
                component={AllDeadlinesScreen}
                options={{
                    tabBarIcon: ({ color, size, focused }) => (
                        <MaterialCommunityIcons name={focused ? "clock" : "clock-outline"} size={size + (focused ? 2 : 0)} color={color} />
                    ),
                }}
            />
            <Tab.Screen
                name="Research"
                component={ResearchScreen}
                options={{
                    tabBarIcon: ({ color, size, focused }) => (
                        <MaterialCommunityIcons name="scale-balance" size={size + (focused ? 2 : 0)} color={color} />
                    ),
                }}
            />
            <Tab.Screen
                name="Analytics"
                component={AnalyticsScreen}
                options={{
                    tabBarIcon: ({ color, size, focused }) => (
                        <MaterialCommunityIcons name={focused ? "chart-bar" : "chart-box-outline"} size={size + (focused ? 2 : 0)} color={color} />
                    ),
                }}
            />
            <Tab.Screen
                name="Settings"
                component={SettingsScreen}
                options={{
                    tabBarIcon: ({ color, size, focused }) => (
                        <MaterialCommunityIcons name={focused ? "cog" : "cog-outline"} size={size + (focused ? 2 : 0)} color={color} />
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

    const modalScreenOptions = {
        presentation: (Platform.OS === 'ios' ? 'modal' : 'card') as 'modal' | 'card',
        animation: (Platform.OS === 'ios' ? 'default' : 'slide_from_bottom') as 'default' | 'slide_from_bottom',
        contentStyle: { backgroundColor: colors.background },
    };

    const cardScreenOptions = {
        presentation: 'card' as const,
        animation: 'slide_from_right' as const,
        contentStyle: { backgroundColor: colors.background },
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
                    options={cardScreenOptions}
                />
                <Stack.Screen
                    name="AddCase"
                    component={AddCaseScreen}
                    options={modalScreenOptions}
                />
                <Stack.Screen
                    name="EditCase"
                    component={EditCaseScreen}
                    options={modalScreenOptions}
                />
                <Stack.Screen
                    name="AddDeadline"
                    component={AddDeadlineScreen}
                    options={modalScreenOptions}
                />
                <Stack.Screen
                    name="EditDeadline"
                    component={EditDeadlineScreen}
                    options={modalScreenOptions}
                />
                <Stack.Screen
                    name="Notifications"
                    component={NotificationsScreen}
                    options={modalScreenOptions}
                />
                <Stack.Screen
                    name="AddDocument"
                    component={AddDocumentScreen}
                    options={modalScreenOptions}
                />
                <Stack.Screen
                    name="DocumentDetail"
                    component={DocumentDetailScreen}
                    options={cardScreenOptions}
                />
                <Stack.Screen
                    name="PrivacyPolicy"
                    component={PrivacyPolicyScreen}
                    options={{
                        ...cardScreenOptions,
                        title: 'Privacy Policy'
                    }}
                />
                <Stack.Screen
                    name="ImageToPdf"
                    component={ImageToPdfScreen}
                    options={cardScreenOptions}
                />
                <Stack.Screen
                    name="Help"
                    component={HelpScreen}
                    options={{
                        ...cardScreenOptions,
                        title: 'User Guide'
                    }}
                />
            </Stack.Navigator>
        </NavigationContainer>
    );
};
