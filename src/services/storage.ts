import AsyncStorage from '@react-native-async-storage/async-storage';
import { StateStorage } from 'zustand/middleware';

export const storage: StateStorage = {
    getItem: async (name: string): Promise<string | null> => {
        try {
            const value = await AsyncStorage.getItem(name);
            return value;
        } catch (e) {
            console.error('Storage Read Error', e);
            return null;
        }
    },
    setItem: async (name: string, value: string): Promise<void> => {
        try {
            await AsyncStorage.setItem(name, value);
        } catch (e) {
            console.error('Storage Write Error', e);
            // In a real app, we might trigger a UI alert here via a separate event emitter
            throw e; // Propagate for store to potentially handle
        }
    },
    removeItem: async (name: string): Promise<void> => {
        try {
            await AsyncStorage.removeItem(name);
        } catch (e) {
            console.error('Storage Delete Error', e);
        }
    },
};
