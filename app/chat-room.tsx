import React, { useEffect, useRef, useState } from 'react';
import { View, ScrollView, TouchableOpacity, Image, Alert, Platform, StyleSheet, TextInput, SafeAreaView, Linking } from 'react-native';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from 'react-native';
import { Input, InputField } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, CreditCard, Smartphone, Building2, ArrowLeft, Camera } from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { db, generateId } from '@/utils/db';
import { ConversationRecord, MessageRecord, PaymentAccount } from '@/types';

// Utility function to normalize conversation data
const normalizeConversation = (conv: any): ConversationRecord => {
    return {
        id: conv.id,
        ownerId: conv.ownerId || conv.owner_id || '',
        tenantId: conv.tenantId || conv.tenant_id || '',
        participantIds: conv.participantIds || conv.participant_ids || [],
        lastMessageText: conv.lastMessageText || conv.last_message_text,
        lastMessageAt: conv.lastMessageAt || conv.last_message_at,
        createdAt: conv.createdAt || conv.created_at || new Date().toISOString(),
        updatedAt: conv.updatedAt || conv.updated_at || new Date().toISOString(),
        unreadByOwner: conv.unreadByOwner || conv.unread_by_owner || 0,
        unreadByTenant: conv.unreadByTenant || conv.unread_by_tenant || 0,
        lastReadByOwner: conv.lastReadByOwner || conv.last_read_by_owner,
        lastReadByTenant: conv.lastReadByTenant || conv.last_read_by_tenant,
    };
};

// Utility function to normalize message data
const normalizeMessage = (msg: any): MessageRecord => {
    return {
        id: msg.id,
        conversationId: msg.conversationId || msg.conversation_id || '',
        senderId: msg.senderId || msg.sender_id || '',
        text: msg.text,
        createdAt: msg.createdAt || msg.created_at || new Date().toISOString(),
        readBy: msg.readBy || msg.read_by || [],
        type: msg.type || 'message',
        propertyId: msg.propertyId || msg.property_id,
        propertyTitle: msg.propertyTitle || msg.property_title,
        imageUri: msg.imageUri || msg.image_uri,
        imageWidth: msg.imageWidth || msg.image_width,
        imageHeight: msg.imageHeight || msg.image_height,
    };
};
import { useAuth } from '@/context/AuthContext';
import { getPaymentAccountsByOwner } from '@/utils/booking';
import * as ImagePicker from 'expo-image-picker';
import { Camera as ExpoCamera } from 'expo-camera';
import {
    Avatar,
    AvatarFallbackText,
    AvatarImage,
} from "@/components/ui/avatar";

type UiMessage = {
    id: string;
    text: string;
    sender: 'me' | 'them';
    timestamp: string;
    type: 'message' | 'image';
    imageUri?: string;
    imageWidth?: number;
    imageHeight?: number;
};

export default function ChatRoom() {
    const { name, avatar, conversationId, otherUserId, propertyId, propertyTitle } = useLocalSearchParams();
    const router = useRouter();
    const { user } = useAuth();
    const [messages, setMessages] = useState<UiMessage[]>([]);
    const [text, setText] = useState('');
    const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccount[]>([]);
    const [hasApprovedBooking, setHasApprovedBooking] = useState(false);
    const [showPaymentMethods, setShowPaymentMethods] = useState(false);
    const [displayName, setDisplayName] = useState(name as string);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isLoadingImage, setIsLoadingImage] = useState(false);
    const scrollRef = useRef<ScrollView>(null);

    // Request camera and media library permissions (mobile only)
    useEffect(() => {
        const requestPermissions = async () => {
            if (Platform.OS === 'web') return; // Skip permissions on web
            
            try {
                console.log('🔐 Requesting camera and media permissions...');
                
                // Use expo-camera for camera permissions (more reliable)
                const { status: cameraStatus } = await ExpoCamera.requestCameraPermissionsAsync();
                const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                
                console.log('🔐 Camera permission status:', cameraStatus);
                console.log('🔐 Media library permission status:', mediaStatus);
                
                if (cameraStatus !== 'granted' || mediaStatus !== 'granted') {
                    Alert.alert(
                        'Permissions Required',
                        'Camera and media library permissions are required to send images. Please enable them in your device settings.',
                        [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Settings', onPress: () => {
                                // On iOS, this will open the app settings
                                if (Platform.OS === 'ios') {
                                    Linking.openURL('app-settings:');
                                }
                            }}
                        ]
                    );
                } else {
                    console.log('✅ All permissions granted');
                }
            } catch (error) {
                console.error('❌ Error requesting permissions:', error);
            }
        };
        
        requestPermissions();
    }, []);

    // Load owner business name for display
    useEffect(() => {
        const loadOwnerDisplayName = async () => {
            if (!otherUserId) return;
            
            try {
                const ownerRecord = await db.get('users', otherUserId as string) as any;
                if (ownerRecord) {
                    // Check for business name in owner profile
                    try {
                        const ownerProfile = await db.get('owner_profiles', otherUserId as string) as any;
                        if (ownerProfile && ownerProfile.businessName) {
                            setDisplayName(ownerProfile.businessName);
                        } else {
                            setDisplayName(ownerRecord.name);
                        }
                    } catch (profileError) {
                        // Fallback to owner name if no business name
                        setDisplayName(ownerRecord.name);
                    }
                }
            } catch (error) {
                console.log('Could not load owner display name:', error);
            }
        };
        
        loadOwnerDisplayName();
    }, [otherUserId]);

    useEffect(() => {
        const loadMessages = async () => {
            console.log('💬 Loading messages...', { conversationId, otherUserId, user: user?.id });
            try {
                let convId = conversationId as string | undefined;
                if (!convId && user && otherUserId) {
                    // create or find conversation
                    const convos = await db.list<ConversationRecord>('conversations');
                    const existing = convos.find(c =>
                        c.participantIds.includes(user.id) && 
                        c.participantIds.includes(otherUserId as string) &&
                        c.participantIds.length === 2
                    );
                    if (existing) {
                        convId = existing.id;
                        console.log('✅ Found existing conversation for loading messages:', convId);
                    }
                    else {
                        const newId = generateId('convo');
                        const now = new Date().toISOString();
                        
                        // Determine who is the owner and who is the tenant
                        // Check if current user is an owner by looking at their role or published listings
                        const userRecord = await db.get('users', user.id) as any;
                        const otherUserRecord = await db.get('users', otherUserId as string) as any;
                        
                        // If current user has published listings, they're likely the owner
                        const userListings = await db.list('published_listings') as any[];
                        const hasUserListings = userListings.some(listing => listing.userId === user.id);
                        
                        // If other user has published listings, they're likely the owner
                        const hasOtherUserListings = userListings.some(listing => listing.userId === otherUserId);
                        
                        let actualOwnerId: string;
                        let actualTenantId: string;
                        
                        // Enhanced role detection with multiple fallbacks
                        // Default: when navigating from property-preview, otherUserId is the owner
                        if (propertyId) {
                            // If we have propertyId, we're messaging about a property
                            // The other user is the owner of that property
                            actualOwnerId = otherUserId as string;
                            actualTenantId = user.id;
                            console.log('🏠 Property context: otherUser is owner of property', propertyId);
                        } else if (hasUserListings && !hasOtherUserListings) {
                            // Current user is owner, other user is tenant
                            actualOwnerId = user.id;
                            actualTenantId = otherUserId as string;
                            console.log('🏢 User has listings, other user does not - user is owner');
                        } else if (hasOtherUserListings && !hasUserListings) {
                            // Other user is owner, current user is tenant
                            actualOwnerId = otherUserId as string;
                            actualTenantId = user.id;
                            console.log('🏢 Other user has listings, user does not - other user is owner');
                        } else if (hasUserListings && hasOtherUserListings) {
                            // Both have listings - default to other user as owner
                            actualOwnerId = otherUserId as string;
                            actualTenantId = user.id;
                            console.log('🏢 Both have listings - defaulting to other user as owner');
                        } else {
                            // Neither has listings - assume other user is owner (common case when tenant messages owner)
                            actualOwnerId = otherUserId as string;
                            actualTenantId = user.id;
                            console.log('🏢 No listings found - defaulting to other user as owner');
                        }
                        
                        const newConvo: ConversationRecord = {
                            id: newId,
                            ownerId: actualOwnerId,
                            tenantId: actualTenantId,
                            participantIds: [user.id, otherUserId as string],
                            createdAt: now,
                            updatedAt: now,
                            unreadByOwner: 0,
                            unreadByTenant: 0,
                        };
                        await db.upsert('conversations', newId, newConvo);
                        convId = newId;
                        
                        console.log(`💬 Created conversation: Owner=${actualOwnerId}, Tenant=${actualTenantId}, Participants=[${user.id}, ${otherUserId}]`);
                    }
                }

                if (convId) {
                    const all = await db.list<MessageRecord>('messages');
                    console.log('📥 Loaded all messages:', all.length);
                    const normalizedMessages = all.map(normalizeMessage);
                    const my = normalizedMessages.filter(m => m.conversationId === convId).sort((a,b) => a.createdAt.localeCompare(b.createdAt));
                    console.log('💬 Messages for this conversation:', my.length);
                    
                    // Remove duplicate messages based on ID using a Map for better deduplication
                    const uniqueMessagesMap = new Map<string, MessageRecord>();
                    my.forEach(msg => {
                        if (!uniqueMessagesMap.has(msg.id)) {
                            uniqueMessagesMap.set(msg.id, msg);
                        }
                    });
                    const uniqueMessages = Array.from(uniqueMessagesMap.values());
                    
                    console.log('💬 Unique messages after deduplication:', uniqueMessages.length);
                    
                    setMessages(uniqueMessages.map(m => ({
                        id: m.id,
                        text: m.text,
                        sender: m.senderId === user?.id ? 'me' : 'them',
                        timestamp: new Date(m.createdAt).toLocaleTimeString(),
                        type: m.type as 'message' | 'image',
                        imageUri: m.imageUri,
                        imageWidth: m.imageWidth,
                        imageHeight: m.imageHeight,
                    })));
                    
                    // Mark conversation as read when user opens chat room
                    try {
                        const conversation = await db.get<ConversationRecord>('conversations', convId);
                        if (conversation && user?.id) {
                            const normalizedConv = normalizeConversation(conversation);
                            const isOwner = user.id === normalizedConv.ownerId;
                            const now = new Date().toISOString();
                            
                            await db.upsert('conversations', convId, {
                                ...normalizedConv,
                                unreadByOwner: isOwner ? 0 : normalizedConv.unreadByOwner,
                                unreadByTenant: !isOwner ? 0 : normalizedConv.unreadByTenant,
                                lastReadByOwner: isOwner ? now : normalizedConv.lastReadByOwner,
                                lastReadByTenant: !isOwner ? now : normalizedConv.lastReadByTenant,
                                updatedAt: now
                            });
                            
                            console.log(`✅ Marked conversation ${convId} as read by ${isOwner ? 'owner' : 'tenant'}`);
                        }
                    } catch (error) {
                        console.error('❌ Error marking conversation as read:', error);
                    }
                    
                    // scroll to end immediately
                    scrollRef.current?.scrollToEnd({ animated: true });
                }
            } catch (e) {
                // ignore
            }
        };
        loadMessages();
    }, [user, conversationId, otherUserId]);

    // Add periodic message refresh to catch new messages
    useEffect(() => {
        if (!conversationId || !user?.id) return;

        const interval = setInterval(async () => {
            try {
                console.log('🔄 Tenant: Checking for new messages...');
                const all = await db.list<MessageRecord>('messages');
                const normalizedMessages = all.map(normalizeMessage);
                const my = normalizedMessages
                    .filter(m => m.conversationId === conversationId as string)
                    .sort((a,b) => a.createdAt.localeCompare(b.createdAt));
                
                // Remove duplicate messages based on ID using a Map for better deduplication
                const uniqueMessagesMap = new Map<string, MessageRecord>();
                my.forEach(msg => {
                    if (!uniqueMessagesMap.has(msg.id)) {
                        uniqueMessagesMap.set(msg.id, msg);
                    }
                });
                const uniqueMessages = Array.from(uniqueMessagesMap.values());
                
                // Only update if there are actually new messages (compare by length and last message ID)
                const currentLastMsgId = messages.length > 0 ? messages[messages.length - 1].id : null;
                const newLastMsgId = uniqueMessages.length > 0 ? uniqueMessages[uniqueMessages.length - 1].id : null;
                
                if (uniqueMessages.length !== messages.length || currentLastMsgId !== newLastMsgId) {
                    console.log('📨 Tenant: New messages found, updating...', {
                        old: messages.length,
                        new: uniqueMessages.length,
                        oldLastId: currentLastMsgId,
                        newLastId: newLastMsgId
                    });
                    setMessages(uniqueMessages.map(m => ({
                        id: m.id,
                        text: m.text,
                        sender: m.senderId === user?.id ? 'me' : 'them',
                        timestamp: new Date(m.createdAt).toLocaleTimeString(),
                        type: m.type as 'message' | 'image',
                        imageUri: m.imageUri,
                        imageWidth: m.imageWidth,
                        imageHeight: m.imageHeight,
                    })));
                }
            } catch (error) {
                console.error('❌ Tenant: Error checking for new messages:', error);
            }
        }, 3000); // Check every 3 seconds (reduced frequency to prevent duplicates)

        return () => clearInterval(interval);
    }, [user, conversationId, messages.length]);

    // Check for approved booking and load payment accounts
    useEffect(() => {
        const checkApprovedBooking = async () => {
            if (!user || !otherUserId) return;
            
            try {
                // Check if there's an approved booking between these users
                const bookings = await db.list('bookings') as any[];
                const approvedBooking = bookings.find(booking => 
                    booking.status === 'approved' &&
                    ((booking.tenantId === user.id && booking.ownerId === otherUserId) ||
                     (booking.ownerId === user.id && booking.tenantId === otherUserId))
                );
                
                if (approvedBooking) {
                    setHasApprovedBooking(true);
                    
                    // Determine who is the owner
                    const ownerId = approvedBooking.ownerId;
                    
                    // Load payment accounts for the owner
                    const accounts = await getPaymentAccountsByOwner(ownerId);
                    setPaymentAccounts(accounts);
                    
                    console.log('✅ Found approved booking, loaded payment accounts:', accounts.length);
                } else {
                    setHasApprovedBooking(false);
                    setPaymentAccounts([]);
                }
            } catch (error) {
                console.error('❌ Error checking approved booking:', error);
            }
        };
        
        checkApprovedBooking();
    }, [user, otherUserId]);

    // Web file input handler
    const handleWebFileInput = (event: any) => {
        const file = event.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const result = e.target?.result as string;
                if (result) {
                    setSelectedImage(result);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    // Image picker functions
    const pickImageFromGallery = async () => {
        try {
            setIsLoadingImage(true);
            
            if (Platform.OS === 'web') {
                // Create file input for web
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = handleWebFileInput;
                input.click();
                return;
            }
            
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
                setSelectedImage(result.assets[0].uri);
            }
        } catch (error) {
            console.error('Error picking image:', error);
            Alert.alert('Error', 'Failed to pick image from gallery');
        } finally {
            setIsLoadingImage(false);
        }
    };

    const takePhoto = async () => {
        try {
            setIsLoadingImage(true);
            
            if (Platform.OS === 'web') {
                Alert.alert('Camera not available', 'Camera is not available on web. Please select an image from your files.');
                return;
            }
            
            // Check camera permissions first using expo-camera
            const { status: cameraStatus } = await ExpoCamera.requestCameraPermissionsAsync();
            if (cameraStatus !== 'granted') {
                Alert.alert(
                    'Camera Permission Required',
                    'Please allow camera access to take photos.',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Settings', onPress: () => {
                            if (Platform.OS === 'ios') {
                                Linking.openURL('app-settings:');
                            }
                        }}
                    ]
                );
                return;
            }
            
            console.log('📸 Launching camera...');
            const result = await ImagePicker.launchCameraAsync({
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
            });

            console.log('📸 Camera result:', result);
            if (!result.canceled && result.assets[0]) {
                setSelectedImage(result.assets[0].uri);
                console.log('✅ Photo selected:', result.assets[0].uri);
            } else {
                console.log('❌ Camera was canceled or no photo taken');
            }
        } catch (error) {
            console.error('❌ Error taking photo:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            Alert.alert('Error', `Failed to take photo: ${errorMessage}`);
        } finally {
            setIsLoadingImage(false);
        }
    };

    const showImageOptions = () => {
        if (Platform.OS === 'web') {
            // On web, directly open file picker
            pickImageFromGallery();
        } else {
            Alert.alert(
                'Select Image',
                'Choose how you want to add an image',
                [
                    { text: 'Camera', onPress: takePhoto },
                    { text: 'Gallery', onPress: pickImageFromGallery },
                    { text: 'Cancel', style: 'cancel' },
                ]
            );
        }
    };

    const MessageBubble = ({ message }: { message: UiMessage }) => (
        <View style={[
            styles.messageContainer,
            message.sender === 'me' ? styles.messageContainerRight : styles.messageContainerLeft
        ]}>
            {message.sender === 'them' && (
                <View style={styles.messageAvatar}>
                    {avatar ? (
                        <Image source={{ uri: avatar as string }} style={styles.messageAvatarImage} />
                    ) : (
                        <View style={styles.messageAvatarFallback}>
                            <Text style={styles.messageAvatarText}>{(name as string)?.[0]?.toUpperCase()}</Text>
                        </View>
                    )}
                </View>
            )}
            <View style={[
                styles.messageBubble,
                message.sender === 'me' ? styles.messageBubbleRight : styles.messageBubbleLeft
            ]}>
                {message.type === 'image' && message.imageUri ? (
                        <Image
                            source={{ uri: message.imageUri }}
                        style={styles.messageImage}
                            resizeMode="cover"
                        />
                ) : null}
                {message.text && (
                    <Text style={[
                        styles.messageText,
                        message.sender === 'me' ? styles.messageTextRight : styles.messageTextLeft
                    ]}>
                        {message.text}
                    </Text>
                )}
                <Text style={[
                    styles.messageTime,
                    message.sender === 'me' ? styles.messageTimeRight : styles.messageTimeLeft
                ]}>
                    {message.timestamp}
                </Text>
            </View>
        </View>
    );

    const PaymentMethodsCard = () => {
        if (!hasApprovedBooking || paymentAccounts.length === 0) return null;
        
        const getPaymentIcon = (type: string) => {
            switch (type.toLowerCase()) {
                case 'gcash':
                    return <Smartphone size={20} color="#0070F3" />;
                case 'paymaya':
                    return <Smartphone size={20} color="#00D4AA" />;
                case 'bank transfer':
                    return <Building2 size={20} color="#10B981" />;
                default:
                    return <CreditCard size={20} color="#6B7280" />;
            }
        };
        
        const getPaymentColor = (type: string) => {
            switch (type.toLowerCase()) {
                case 'gcash':
                    return 'bg-blue-50 border-blue-200';
                case 'paymaya':
                    return 'bg-green-50 border-green-200';
                case 'bank transfer':
                    return 'bg-purple-50 border-purple-200';
                default:
                    return 'bg-gray-50 border-gray-200';
            }
        };
        
        return (
            <View className="mx-4 mb-4">
                <View className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                    <View className="flex-row items-center justify-between mb-3">
                        <Text className="text-lg font-semibold text-gray-900">💳 Payment Methods</Text>
                        <TouchableOpacity
                            onPress={() => setShowPaymentMethods(!showPaymentMethods)}
                            className="bg-blue-600 px-3 py-1 rounded-lg"
                        >
                            <Text className="text-white text-sm font-medium">
                                {showPaymentMethods ? 'Hide' : 'Show'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                    
                    <Text className="text-gray-600 text-sm mb-3">
                        Your booking has been approved! Here are the available payment methods:
                    </Text>
                    
                    {showPaymentMethods && (
                        <VStack space="sm">
                            {paymentAccounts.map((account) => (
                                <View 
                                    key={account.id} 
                                    className={`p-3 rounded-lg border ${getPaymentColor(account.type)}`}
                                >
                                    <View className="flex-row items-center mb-2">
                                        {getPaymentIcon(account.type)}
                                        <Text className="text-gray-900 font-medium ml-2">
                                            {account.type}
                                        </Text>
                                    </View>
                                    <Text className="text-gray-700 text-sm font-medium">
                                        {account.accountName}
                                    </Text>
                                    <Text className="text-gray-600 text-sm">
                                        {account.accountNumber}
                                    </Text>
                                    {account.accountDetails && (
                                        <Text className="text-gray-500 text-xs mt-1">
                                            {account.accountDetails}
                                        </Text>
                                    )}
                                </View>
                            ))}
                        </VStack>
                    )}
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Modern Header */}
            <View style={styles.header}>
                <TouchableOpacity 
                    style={styles.backButton}
                    onPress={() => router.back()}
                >
                    <ArrowLeft size={24} color="#374151" />
                </TouchableOpacity>
                
                <View style={styles.headerInfo}>
                    <View style={styles.avatarContainer}>
                    {avatar ? (
                            <Image source={{ uri: avatar as string }} style={styles.avatar} />
                        ) : (
                            <View style={styles.avatarFallback}>
                                <Text style={styles.avatarText}>{(name as string)?.[0]?.toUpperCase()}</Text>
                            </View>
                        )}
                    </View>
                    <View style={styles.headerText}>
                        <Text style={styles.headerName}>{displayName}</Text>
                        <Text style={styles.headerStatus}>Online</Text>
                    </View>
                </View>
                
            </View>

            {/* Messages Area */}
            <ScrollView 
                ref={scrollRef} 
                style={styles.messagesContainer}
                contentContainerStyle={styles.messagesContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Payment Methods Card */}
                    <PaymentMethodsCard />
                    
                {/* Messages */}
                    {messages.map((message) => (
                        <MessageBubble key={message.id} message={message} />
                    ))}
            </ScrollView>

            {/* Selected Image Preview */}
            {selectedImage && (
                <View style={styles.imagePreview}>
                    <View style={styles.imagePreviewContent}>
                            <Image
                                source={{ uri: selectedImage }}
                            style={styles.previewImage}
                                resizeMode="cover"
                            />
                        <View style={styles.imagePreviewInfo}>
                            <Text style={styles.imagePreviewText}>Image selected</Text>
                            <Text style={styles.imagePreviewSize}>Tap to send</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.removeImageButton}
                            onPress={() => setSelectedImage(null)}
                        >
                            <Text style={styles.removeImageText}>✕</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Modern Message Input */}
            <View style={styles.inputContainer}>
                <View style={styles.inputWrapper}>
                <TouchableOpacity
                        style={styles.attachButton}
                    onPress={showImageOptions}
                    disabled={isLoadingImage}
                >
                    {isLoadingImage ? (
                            <Text style={styles.attachButtonText}>...</Text>
                    ) : (
                            <Camera size={20} color="#10B981" />
                    )}
                </TouchableOpacity>
                    
                    <TextInput
                        style={styles.textInput}
                        placeholder="Type a message..." 
                        placeholderTextColor="#9CA3AF"
                        value={text} 
                        onChangeText={setText} 
                        multiline
                        maxLength={1000}
                    />
                    
                    <TouchableOpacity
                        style={[styles.sendButton, (!text.trim() && !selectedImage) && styles.sendButtonDisabled]}
                    onPress={async () => {
                            console.log('📤 Sending message...', { text: text.trim(), selectedImage, user: user?.id });
                        if ((!text.trim() && !selectedImage) || !user) return;
                        
                        try {
                        const now = new Date().toISOString();
                        let convId = (conversationId as string) || '';
                        if (!convId && otherUserId) {
                            const convos = await db.list<ConversationRecord>('conversations');
                            const existing = convos.find(c => 
                                c.participantIds.includes(user.id) && 
                                c.participantIds.includes(otherUserId as string) &&
                                c.participantIds.length === 2
                            );
                            if (existing) {
                                convId = existing.id;
                                console.log('✅ Found existing conversation:', convId);
                            }
                        }
                        if (!convId) {
                            const newId = generateId('convo');
                            
                            // Determine who is the owner and who is the tenant
                            const userListings = await db.list('published_listings') as any[];
                            const hasUserListings = userListings.some(listing => listing.userId === user.id);
                            const hasOtherUserListings = userListings.some(listing => listing.userId === otherUserId);
                            
                            let actualOwnerId: string;
                            let actualTenantId: string;
                            
                            // Use same logic as conversation creation
                            if (propertyId) {
                                // If we have propertyId, we're messaging about a property
                                actualOwnerId = otherUserId as string;
                                actualTenantId = user.id;
                                console.log('🏠 Send: Property context - otherUser is owner');
                            } else if (hasUserListings && !hasOtherUserListings) {
                                actualOwnerId = user.id;
                                actualTenantId = otherUserId as string;
                                console.log('🏢 Send: User is owner');
                            } else if (hasOtherUserListings && !hasUserListings) {
                                actualOwnerId = otherUserId as string;
                                actualTenantId = user.id;
                                console.log('🏢 Send: Other user is owner');
                            } else {
                                actualOwnerId = otherUserId as string;
                                actualTenantId = user.id;
                                console.log('🏢 Send: Default to other user as owner');
                            }
                            
                            const convo: ConversationRecord = {
                                id: newId,
                                ownerId: actualOwnerId,
                                tenantId: actualTenantId,
                                participantIds: [user.id, (otherUserId as string) || user.id],
                                createdAt: now,
                                updatedAt: now,
                                unreadByOwner: 0,
                                unreadByTenant: 0,
                            };
                            await db.upsert('conversations', newId, convo);
                            convId = newId;
                            
                            console.log(`💬 Created conversation on send: Owner=${actualOwnerId}, Tenant=${actualTenantId}`);
                        }
                        
                        // Check if message already exists to prevent duplicates
                        const existingMessages = await db.list<MessageRecord>('messages');
                        const isDuplicate = existingMessages.some(m => 
                            m.conversationId === convId &&
                            m.senderId === user.id &&
                            m.text === text.trim() &&
                            Math.abs(new Date(m.createdAt).getTime() - new Date(now).getTime()) < 1000
                        );
                        
                        if (isDuplicate) {
                            console.log('⚠️ Duplicate message detected, skipping...');
                            setText('');
                            setSelectedImage(null);
                            return;
                        }
                        
                        const msgId = generateId('msg');
                        const msg: MessageRecord = {
                            id: msgId,
                            conversationId: convId,
                            senderId: user.id,
                            text: text.trim() || (selectedImage ? '📷 Image' : ''),
                            createdAt: now,
                            readBy: [user.id],
                            type: selectedImage ? 'image' : 'message',
                            propertyId: propertyId as string || '',
                            propertyTitle: propertyTitle as string || '',
                            imageUri: selectedImage || undefined,
                            imageWidth: selectedImage ? 250 : undefined,
                            imageHeight: selectedImage ? 200 : undefined,
                        };
                            console.log('💾 Saving message to database:', msg);
                        await db.upsert('messages', msgId, msg);
                            console.log('✅ Message saved successfully');
                            
                        // Debug: Verify message was saved
                        const savedMessage = await db.get('messages', msgId);
                        console.log('🔍 Debug - Saved message verification:', savedMessage);
                            
                        const existingConvo = await db.get<ConversationRecord>('conversations', convId);
                        const normalizedConv = existingConvo ? normalizeConversation(existingConvo) : null;
                        const isOwner = user.id === normalizedConv?.ownerId;
                        
                        await db.upsert('conversations', convId, {
                            id: convId,
                            ownerId: normalizedConv?.ownerId || user.id,
                            tenantId: normalizedConv?.tenantId || (otherUserId as string) || user.id,
                            participantIds: [user.id, (otherUserId as string) || user.id],
                            createdAt: normalizedConv?.createdAt || now,
                            updatedAt: now,
                            lastMessageText: msg.text,
                            lastMessageAt: now,
                            unreadByOwner: isOwner ? (normalizedConv?.unreadByOwner || 0) : (normalizedConv?.unreadByOwner || 0) + 1,
                            unreadByTenant: !isOwner ? (normalizedConv?.unreadByTenant || 0) : (normalizedConv?.unreadByTenant || 0) + 1,
                            lastReadByOwner: isOwner ? now : (normalizedConv?.lastReadByOwner || ''),
                            lastReadByTenant: !isOwner ? now : (normalizedConv?.lastReadByTenant || ''),
                        } as ConversationRecord);
                        
                        // Add message to local state (deduplication handled by ID)
                        setMessages(prev => {
                            // Check if message already exists
                            const exists = prev.some(m => m.id === msgId);
                            if (exists) {
                                console.log('⚠️ Message already in state, skipping...');
                                return prev;
                            }
                            return [...prev, { 
                                id: msgId, 
                                text: msg.text, 
                                sender: 'me', 
                                timestamp: new Date(now).toLocaleTimeString(),
                                type: msg.type as 'message' | 'image',
                                imageUri: msg.imageUri,
                                imageWidth: msg.imageWidth,
                                imageHeight: msg.imageHeight,
                            }];
                        });
                        setText('');
                        setSelectedImage(null);
                        scrollRef.current?.scrollToEnd({ animated: true });
                        } catch (error) {
                            console.error('❌ Error sending message:', error);
                        }
                    }}
                        disabled={!text.trim() && !selectedImage}
                    >
                        <Send size={20} color={(!text.trim() && !selectedImage) ? "#9CA3AF" : "#FFFFFF"} />
                    </TouchableOpacity>
                </View>
        </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    backButton: {
        padding: 8,
        marginRight: 8,
    },
    headerInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarContainer: {
        marginRight: 12,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    avatarFallback: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#10B981',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    headerText: {
        flex: 1,
    },
    headerName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 2,
    },
    headerStatus: {
        fontSize: 12,
        color: '#10B981',
        fontWeight: '500',
    },
    messagesContainer: {
        flex: 1,
    },
    messagesContent: {
        padding: 16,
        paddingBottom: 8,
    },
    imagePreview: {
        backgroundColor: '#F3F4F6',
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    imagePreviewContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    previewImage: {
        width: 50,
        height: 50,
        borderRadius: 8,
        marginRight: 12,
    },
    imagePreviewInfo: {
        flex: 1,
    },
    imagePreviewText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#374151',
        marginBottom: 2,
    },
    imagePreviewSize: {
        fontSize: 12,
        color: '#6B7280',
    },
    removeImageButton: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#EF4444',
        justifyContent: 'center',
        alignItems: 'center',
    },
    removeImageText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
    },
    inputContainer: {
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        backgroundColor: '#F9FAFB',
        borderRadius: 24,
        paddingHorizontal: 4,
        paddingVertical: 4,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    attachButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#F0FDF4',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    attachButtonText: {
        fontSize: 12,
        color: '#6B7280',
    },
    textInput: {
        flex: 1,
        fontSize: 16,
        color: '#111827',
        maxHeight: 100,
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    sendButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#10B981',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    sendButtonDisabled: {
        backgroundColor: '#E5E7EB',
    },
    // Message bubble styles
    messageContainer: {
        flexDirection: 'row',
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    messageContainerLeft: {
        justifyContent: 'flex-start',
    },
    messageContainerRight: {
        justifyContent: 'flex-end',
    },
    messageAvatar: {
        marginRight: 8,
        marginTop: 4,
    },
    messageAvatarImage: {
        width: 32,
        height: 32,
        borderRadius: 16,
    },
    messageAvatarFallback: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#10B981',
        justifyContent: 'center',
        alignItems: 'center',
    },
    messageAvatarText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
    },
    messageBubble: {
        flex: 1,
        maxWidth: 300,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    messageBubbleLeft: {
        backgroundColor: '#FFFFFF',
        borderBottomLeftRadius: 4,
    },
    messageBubbleRight: {
        backgroundColor: '#10B981',
        borderBottomRightRadius: 4,
    },
    messageImage: {
        width: 200,
        height: 150,
        borderRadius: 12,
        marginBottom: 8,
    },
    messageText: {
        fontSize: 16,
        lineHeight: 20,
        marginBottom: 4,
    },
    messageTextLeft: {
        color: '#111827',
    },
    messageTextRight: {
        color: '#FFFFFF',
    },
    messageTime: {
        fontSize: 11,
        opacity: 0.7,
    },
    messageTimeLeft: {
        color: '#6B7280',
        textAlign: 'left',
    },
    messageTimeRight: {
        color: '#FFFFFF',
        textAlign: 'right',
    },
});