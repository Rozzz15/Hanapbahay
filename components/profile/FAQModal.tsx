import React from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface FAQModalProps {
    visible: boolean;
    onClose: () => void;
}

const FAQModal: React.FC<FAQModalProps> = ({ visible, onClose }) => {
    const faqItems = [
        {
            question: "How do I search for properties in HanapBahay?",
            answer: "Use the search bar on the dashboard to search by location, property type, or keywords. You can also use the filter button to narrow down by barangay, price range, and property type (house, apartment, boarding house, bedspace)."
        },
        {
            question: "How do I filter properties by barangay?",
            answer: "Tap the filter button on the dashboard, then select your preferred barangay from the dropdown (Danlagan, Gomez, Magsaysay, Rizal, Bocboc, or Talolong). Click \"Apply Filters\" to see only properties in that area."
        },
        {
            question: "How do I contact a property owner?",
            answer: "Tap on any property listing to view details, then use the \"Contact Owner\" button or go to the Chat tab to start a conversation with the property owner directly."
        },
        {
            question: "What information do I need to provide when contacting owners?",
            answer: "Be ready to share your name, contact number, move-in date, rental budget, and any specific requirements. This helps owners respond faster with relevant information."
        },
        {
            question: "How do I book a property viewing?",
            answer: "Contact the property owner through the chat feature to schedule a viewing. Owners will coordinate with you to arrange a convenient time for property inspection."
        },
        {
            question: "What types of properties are available?",
            answer: "HanapBahay offers houses, apartments, boarding houses, and bedspaces. Each property includes details like monthly rent, number of rooms, size, amenities, and location information."
        },
        {
            question: "How do I set my price range?",
            answer: "Use the price range slider in the filter section to set your minimum and maximum monthly rent budget. The app will show only properties within your specified price range."
        },
        {
            question: "How do I update my profile information?",
            answer: "Go to your profile tab and tap \"Personal details\" to update your name, email, phone number, and address. Changes are saved automatically to help owners contact you easily."
        },
        {
            question: "How do I clear my search filters?",
            answer: "On the dashboard, tap the \"Clear All\" button in the Active Filters section to remove all applied filters and see all available properties again."
        },
        {
            question: "What if I can't find properties in my preferred area?",
            answer: "Try expanding your search criteria by adjusting the price range or selecting \"Any Type\" for property type. You can also contact owners directly to ask about availability in your preferred location."
        },
        {
            question: "How do I report an issue with a property listing?",
            answer: "Contact our support team through the chat feature or email us at support@hanapbahay.com. Include the property details and description of the issue for faster resolution."
        },
        {
            question: "Is my personal information secure?",
            answer: "Yes, we prioritize your privacy and security. Your personal information is only shared with property owners when you initiate contact, and we never sell your data to third parties."
        }
    ];

    return (
        <Modal 
            visible={visible} 
            animationType="slide" 
            presentationStyle="pageSheet"
        >
            <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Frequently Asked Questions</Text>
                    <TouchableOpacity onPress={onClose}>
                        <Ionicons name="close" size={24} color="#6B7280" />
                    </TouchableOpacity>
                </View>
                <ScrollView style={styles.modalContent}>
                    <View style={styles.faqContent}>
                        {faqItems.map((item, index) => (
                            <View key={index} style={styles.faqItem}>
                                <Text style={styles.faqQuestion}>{item.question}</Text>
                                <Text style={styles.faqAnswer}>{item.answer}</Text>
                            </View>
                        ))}
                    </View>
                </ScrollView>
            </View>
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
    faqContent: {
        gap: 24,
    },
    faqItem: {
        gap: 8,
    },
    faqQuestion: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
    },
    faqAnswer: {
        fontSize: 16,
        color: '#6B7280',
        lineHeight: 24,
    },
});

export default FAQModal;
