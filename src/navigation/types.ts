import { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
    MainTabs: NavigatorScreenParams<MainTabParamList>;
    AddCase: undefined;
    EditCase: { caseId: string };
    AddDeadline: { caseId?: string };
    EditDeadline: { deadlineId: string };
    CaseDetail: { caseId: string };
    Notifications: undefined;
    AddDocument: { caseId?: string };
    DocumentDetail: { documentId: string };
    PrivacyPolicy: undefined;
    Help: undefined;
};

export type MainTabParamList = {
    Dashboard: undefined;
    Cases: undefined;
    Research: undefined;
    Analytics: undefined;
    Deadlines: undefined;
    Settings: undefined;
};
