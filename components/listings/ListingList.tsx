import React from 'react';
import { ScrollView, View, useWindowDimensions, RefreshControl, StyleSheet } from 'react-native';
import { VStack } from '@/components/ui/vstack';
import { Text } from '@/components/ui/text';
import ListingCard, { ListingType } from './ListingCard';

interface ListingListProps {
    listings: ListingType[];
    gap?: number;
    title?: string;
    subtitle?: string;
    onRefresh?: () => void;
    refreshing?: boolean;
}

const ListingList: React.FC<ListingListProps> = ({ 
    listings, 
    gap = 20, 
    title,
    subtitle,
    onRefresh,
    refreshing = false 
}) => {
    const { width } = useWindowDimensions();
    const isMobile = width < 768;
    
    return (
        <VStack style={styles.container}>
            {/* Header Section */}
            {(title || subtitle) && (
                <VStack style={styles.header}>
                    {title && (
                        <Text size="2xl" bold style={styles.title}>
                            {title}
                        </Text>
                    )}
                    {subtitle && (
                        <Text size="sm" style={styles.subtitle}>
                            {subtitle}
                        </Text>
                    )}
                </VStack>
            )}

            {/* Listings */}
            <VStack space="sm" style={styles.listings}>
                {listings.length > 0 ? (
                    listings.map((listing, index) => (
                        <ListingCard 
                            key={`${listing.title}-${index}`}
                            {...listing} 
                        />
                    ))
                ) : (
                    <VStack style={styles.emptyState}>
                        <Text bold size="lg" style={styles.emptyTitle}>
                            No properties found
                        </Text>
                        <Text size="sm" style={styles.emptySubtitle}>
                            Try adjusting your search criteria
                        </Text>
                    </VStack>
                )}
            </VStack>
        </VStack>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#F9FAFB',
    },
    header: {
        paddingHorizontal: 24,
        paddingVertical: 16,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    title: {
        color: '#111827',
        marginBottom: 4,
    },
    subtitle: {
        color: '#4B5563',
    },
    listings: {
        padding: 16,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 80,
    },
    emptyTitle: {
        color: '#6B7280',
        marginBottom: 8,
    },
    emptySubtitle: {
        color: '#9CA3AF',
        textAlign: 'center',
    },
});

export default ListingList; 