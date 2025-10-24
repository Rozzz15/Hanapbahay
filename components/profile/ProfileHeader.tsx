import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

interface ProfileHeaderProps {
    firstName: string;
    lastName: string;
    email: string;
    profilePhoto: string | null;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({
    firstName,
    lastName,
    email,
    profilePhoto
}) => {
    return (
        <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
                {profilePhoto ? (
                    <Image 
                        source={{ uri: profilePhoto }}
                        style={styles.avatarImage}
                        resizeMode="cover"
                    />
                ) : (
                    <Text style={styles.avatarText}>
                        {firstName && lastName 
                            ? `${firstName.charAt(0)}${lastName.charAt(0)}`
                            : '?'
                        }
                    </Text>
                )}
            </View>
            <Text style={styles.profileName}>
                {firstName && lastName 
                    ? `${firstName} ${lastName}`
                    : firstName
                    ? firstName
                    : email
                    ? email.split('@')[0]
                    : 'Complete Your Profile'
                }
            </Text>
            <Text style={styles.profileEmail}>
                {email || 'Please add your email'}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    profileHeader: {
        alignItems: 'center',
        paddingTop: 40,
        paddingBottom: 24,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    avatarContainer: {
        width: 128,
        height: 128,
        borderRadius: 64,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        overflow: 'hidden',
    },
    avatarImage: {
        width: 128,
        height: 128,
        borderRadius: 64,
    },
    avatarText: {
        fontSize: 48,
        fontWeight: '600',
        color: '#6B7280',
    },
    profileName: {
        fontSize: 24,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 4,
        textAlign: 'center',
    },
    profileEmail: {
        fontSize: 16,
        color: '#9CA3AF',
        textAlign: 'center',
    },
});

export default ProfileHeader;
