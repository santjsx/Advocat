import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { UrgencyLevel } from '../models/Deadline';
import { colors } from '../theme/colors';

interface Props {
    level: UrgencyLevel;
}

export const UrgencyBadge: React.FC<Props> = ({ level }) => {
    let color = colors.safe;
    let label = 'UPCOMING';

    switch (level) {
        case 'CRITICAL': color = colors.critical; label = 'URGENT'; break;
        case 'HIGH': color = colors.warning; label = 'SOON'; break;
        case 'MEDIUM': color = colors.accent; label = 'MEDIUM'; break;
        case 'LOW': color = colors.safe; label = 'UPCOMING'; break;
    }

    return (
        <View style={[styles.badge, { backgroundColor: color }]}>
            <Text style={styles.text}>{label}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        alignSelf: 'flex-start',
    },
    text: {
        color: 'black',
        fontSize: 10,
        fontWeight: 'bold',
    },
});
