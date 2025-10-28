import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    Modal, 
    ScrollView, 
    TextInput, 
    TouchableOpacity, 
    Image, 
    Alert,
    StyleSheet,
    KeyboardAvoidingView,
    Keyboard,
    Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { PersonalDetails } from '../../hooks/useProfileData';

interface PersonalDetailsModalProps {
    visible: boolean;
    personalDetails: PersonalDetails;
    onClose: () => void;
    onSave: (details: PersonalDetails) => void;
}

const PersonalDetailsModal: React.FC<PersonalDetailsModalProps> = ({
    visible,
    personalDetails,
    onClose,
    onSave
}) => {
    const [tempDetails, setTempDetails] = useState<PersonalDetails>(personalDetails);
    const countryCode = '+63';

    // Update tempDetails when personalDetails prop changes
    useEffect(() => {
        setTempDetails(personalDetails);
    }, [personalDetails]);

    const handlePhotoAction = async (action: 'gallery' | 'remove') => {
        if (action === 'remove') {
            Alert.alert(
                'Remove Photo',
                'Are you sure you want to remove your profile photo?',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Remove',
                        style: 'destructive',
                        onPress: () => {
                            setTempDetails(prev => ({...prev, profilePhoto: null}));
                        }
                    }
                ]
            );
        } else {
            try {
                const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
                
                if (!permissionResult.granted) {
                    return;
                }
                
                const result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ['images'],
                    allowsEditing: true,
                    aspect: [1, 1] as [number, number],
                    quality: 0.7,
                    base64: true,
                });

                if (!result.canceled && result.assets && result.assets.length > 0) {
                    const selectedImage = result.assets[0];
                    
                    let imageUri = selectedImage.uri;
                    if (Platform.OS === 'web' && selectedImage.base64) {
                        imageUri = `data:${selectedImage.type || 'image/jpeg'};base64,${selectedImage.base64}`;
                    }
                    
                    setTempDetails(prev => ({...prev, profilePhoto: imageUri}));
                }
            } catch (error) {
                console.error('Error selecting photo:', error);
            }
        }
    };

    const handleSave = () => {
        onSave(tempDetails);
    };

    return (
        <Modal 
            visible={visible} 
            animationType="slide" 
            presentationStyle="pageSheet"
        >
            <KeyboardAvoidingView 
                style={styles.modalContainer}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Personal Details</Text>
                    <TouchableOpacity onPress={() => {
                        Keyboard.dismiss();
                        onClose();
                    }}>
                        <Ionicons name="close" size={24} color="#6B7280" />
                    </TouchableOpacity>
                </View>
                <ScrollView 
                    style={styles.modalContent}
                    keyboardShouldPersistTaps="handled"
                >
                    <TouchableOpacity 
                        activeOpacity={1} 
                        onPress={Keyboard.dismiss}
                    >
                        <View style={styles.modalForm}>
                        {/* Profile Photo Section */}
                        <View style={styles.photoSection}>
                            <View style={styles.photoSectionHeader}>
                                <Text style={styles.photoSectionTitle}>Profile Photo</Text>
                                {tempDetails.profilePhoto !== personalDetails.profilePhoto && (
                                    <View style={styles.unsavedBadge}>
                                        <Text style={styles.unsavedText}>Unsaved</Text>
                                    </View>
                                )}
                            </View>
                            <View style={styles.photoContainer}>
                                <View style={styles.modalAvatar}>
                                    {tempDetails.profilePhoto ? (
                                        <Image 
                                            source={{ uri: tempDetails.profilePhoto }}
                                            style={styles.modalAvatarImage}
                                            resizeMode="cover"
                                        />
                                    ) : (
                                        <Text style={styles.modalAvatarText}>
                                            {tempDetails.firstName && tempDetails.lastName 
                                                ? `${tempDetails.firstName.charAt(0)}${tempDetails.lastName.charAt(0)}`
                                                : '?'
                                            }
                                        </Text>
                                    )}
                                </View>
                                
                                <View style={styles.photoActions}>
                                    <TouchableOpacity
                                        onPress={() => handlePhotoAction('gallery')}
                                        style={styles.selectPhotoButton}
                                    >
                                        <Ionicons name="image" size={16} color="#3B82F6" />
                                        <Text style={styles.selectPhotoText}>Select Photo</Text>
                                    </TouchableOpacity>
                                    
                                    {tempDetails.profilePhoto && (
                                        <TouchableOpacity
                                            onPress={() => handlePhotoAction('remove')}
                                            style={styles.removePhotoButton}
                                        >
                                            <Ionicons name="trash" size={16} color="#EF4444" />
                                            <Text style={styles.removePhotoText}>Remove</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        </View>
                        
                        {/* Form Fields */}
                        <View style={styles.formSection}>
                            <View style={styles.inputContainer}>
                                <Text style={styles.inputLabel}>First Name</Text>
                                <TextInput
                                    style={styles.textInput}
                                    value={tempDetails.firstName}
                                    onChangeText={(text) => setTempDetails({...tempDetails, firstName: text})}
                                />
                            </View>
                            
                            <View style={styles.inputContainer}>
                                <Text style={styles.inputLabel}>Last Name</Text>
                                <TextInput
                                    style={styles.textInput}
                                    value={tempDetails.lastName}
                                    onChangeText={(text) => setTempDetails({...tempDetails, lastName: text})}
                                />
                            </View>
                            
                            <View style={styles.inputContainer}>
                                <Text style={styles.inputLabel}>Email</Text>
                                <TextInput
                                    style={styles.textInput}
                                    value={tempDetails.email}
                                    onChangeText={(text) => setTempDetails({...tempDetails, email: text})}
                                    keyboardType="email-address"
                                />
                            </View>
                            
                            <View style={styles.inputContainer}>
                                <Text style={styles.inputLabel}>Phone Number</Text>
                                <View style={styles.phoneContainer}>
                                    <View style={styles.countryCode}>
                                        <Text style={styles.countryCodeText}>🇵🇭 {countryCode}</Text>
                                    </View>
                                    <TextInput
                                        style={styles.phoneInput}
                                        value={tempDetails.phone.replace(countryCode + ' ', '')}
                                        onChangeText={(text) => {
                                            const digitsOnly = text.replace(/\D/g, '');
                                            if (digitsOnly.length <= 10) {
                                                const fullPhone = countryCode + ' ' + digitsOnly;
                                                setTempDetails({...tempDetails, phone: fullPhone});
                                            }
                                        }}
                                        placeholder="912 345 6789"
                                        keyboardType="phone-pad"
                                        maxLength={10}
                                        editable={true}
                                        selectTextOnFocus={true}
                                    />
                                </View>
                            </View>
                            
                            <View style={styles.inputContainer}>
                                <Text style={styles.inputLabel}>Address</Text>
                                <TextInput
                                    style={[styles.textInput, styles.addressInput]}
                                    value={tempDetails.address}
                                    onChangeText={(text) => setTempDetails({...tempDetails, address: text})}
                                    multiline
                                    numberOfLines={3}
                                />
                            </View>

                            {/* Gender Selection */}
                            <View style={styles.inputContainer}>
                                <Text style={styles.inputLabel}>Gender</Text>
                                <View style={styles.radioGroup}>
                                    <TouchableOpacity
                                        style={[
                                            styles.radioOption,
                                            tempDetails.gender === 'male' && styles.radioOptionSelected
                                        ]}
                                        onPress={() => setTempDetails({...tempDetails, gender: 'male'})}
                                    >
                                        <View style={[
                                            styles.radioCircle,
                                            tempDetails.gender === 'male' && styles.radioCircleSelected
                                        ]}>
                                            {tempDetails.gender === 'male' && <View style={styles.radioInner} />}
                                        </View>
                                        <Text style={[
                                            styles.radioText,
                                            tempDetails.gender === 'male' && styles.radioTextSelected
                                        ]}>Male</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[
                                            styles.radioOption,
                                            tempDetails.gender === 'female' && styles.radioOptionSelected
                                        ]}
                                        onPress={() => setTempDetails({...tempDetails, gender: 'female'})}
                                    >
                                        <View style={[
                                            styles.radioCircle,
                                            tempDetails.gender === 'female' && styles.radioCircleSelected
                                        ]}>
                                            {tempDetails.gender === 'female' && <View style={styles.radioInner} />}
                                        </View>
                                        <Text style={[
                                            styles.radioText,
                                            tempDetails.gender === 'female' && styles.radioTextSelected
                                        ]}>Female</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Family Type Selection */}
                            <View style={styles.inputContainer}>
                                <Text style={styles.inputLabel}>Family Type</Text>
                                <View style={styles.radioGroup}>
                                    <TouchableOpacity
                                        style={[
                                            styles.radioOption,
                                            tempDetails.familyType === 'individual' && styles.radioOptionSelected
                                        ]}
                                        onPress={() => setTempDetails({...tempDetails, familyType: 'individual'})}
                                    >
                                        <View style={[
                                            styles.radioCircle,
                                            tempDetails.familyType === 'individual' && styles.radioCircleSelected
                                        ]}>
                                            {tempDetails.familyType === 'individual' && <View style={styles.radioInner} />}
                                        </View>
                                        <Text style={[
                                            styles.radioText,
                                            tempDetails.familyType === 'individual' && styles.radioTextSelected
                                        ]}>Individual</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[
                                            styles.radioOption,
                                            tempDetails.familyType === 'family' && styles.radioOptionSelected
                                        ]}
                                        onPress={() => setTempDetails({...tempDetails, familyType: 'family'})}
                                    >
                                        <View style={[
                                            styles.radioCircle,
                                            tempDetails.familyType === 'family' && styles.radioCircleSelected
                                        ]}>
                                            {tempDetails.familyType === 'family' && <View style={styles.radioInner} />}
                                        </View>
                                        <Text style={[
                                            styles.radioText,
                                            tempDetails.familyType === 'family' && styles.radioTextSelected
                                        ]}>Family</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                        </View>
                    </TouchableOpacity>
                </ScrollView>
                
                <View style={styles.modalFooter}>
                    <TouchableOpacity
                        style={styles.saveButton}
                        onPress={handleSave}
                    >
                        <Text style={styles.saveButtonText}>Save Changes</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
    },
    modalContent: {
        flex: 1,
        padding: 20,
    },
    modalForm: {
        gap: 24,
    },
    photoSection: {
        alignItems: 'center',
    },
    photoSectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    photoSectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
    },
    unsavedBadge: {
        backgroundColor: '#FEF3C7',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        marginLeft: 8,
    },
    unsavedText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#92400E',
    },
    photoContainer: {
        alignItems: 'center',
    },
    modalAvatar: {
        width: 128,
        height: 128,
        borderRadius: 64,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        overflow: 'hidden',
    },
    modalAvatarImage: {
        width: 128,
        height: 128,
        borderRadius: 64,
    },
    modalAvatarText: {
        fontSize: 48,
        fontWeight: '600',
        color: '#6B7280',
    },
    photoActions: {
        flexDirection: 'row',
        gap: 12,
    },
    selectPhotoButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EFF6FF',
        borderWidth: 1,
        borderColor: '#BFDBFE',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    selectPhotoText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#3B82F6',
        marginLeft: 4,
    },
    removePhotoButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FECACA',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    removePhotoText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#EF4444',
        marginLeft: 4,
    },
    formSection: {
        gap: 16,
    },
    inputContainer: {
        gap: 8,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#374151',
    },
    textInput: {
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
        fontSize: 16,
        color: '#111827',
        backgroundColor: '#FFFFFF',
    },
    addressInput: {
        height: 80,
        textAlignVertical: 'top',
    },
    phoneContainer: {
        flexDirection: 'row',
        gap: 8,
    },
    countryCode: {
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
        backgroundColor: '#F9FAFB',
        justifyContent: 'center',
        alignItems: 'center',
        minWidth: 100,
    },
    countryCodeText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#374151',
    },
    phoneInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
        fontSize: 16,
        color: '#111827',
        backgroundColor: '#FFFFFF',
    },
    radioGroup: {
        flexDirection: 'row',
        gap: 16,
    },
    radioOption: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        flex: 1,
    },
    radioOptionSelected: {
        borderColor: '#10B981',
        backgroundColor: '#F0FDF4',
    },
    radioCircle: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#D1D5DB',
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioCircleSelected: {
        borderColor: '#10B981',
    },
    radioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#10B981',
    },
    radioText: {
        fontSize: 16,
        color: '#374151',
        fontWeight: '500',
    },
    radioTextSelected: {
        color: '#10B981',
    },
    modalFooter: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    saveButton: {
        backgroundColor: '#10B981',
        borderRadius: 8,
        paddingVertical: 16,
        alignItems: 'center',
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default PersonalDetailsModal;
