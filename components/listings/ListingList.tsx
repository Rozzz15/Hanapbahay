import React from 'react';
import { ScrollView, View, useWindowDimensions, RefreshControl } from 'react-native';
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
        <VStack className="bg-gray-50">
            {/* Header Section */}
            {(title || subtitle) && (
                <VStack className="px-6 py-4 bg-white border-b border-gray-100">
                    {title && (
                        <Text className="text-2xl font-bold text-gray-900 mb-1">
                            {title}
                        </Text>
                    )}
                    {subtitle && (
                        <Text className="text-sm text-gray-600">
                            {subtitle}
                        </Text>
                    )}
                </VStack>
            )}

            {/* Listings */}
            <VStack className="space-y-4 p-4">
                {listings.length > 0 ? (
                    listings.map((listing, index) => (
                        <ListingCard 
                            key={`${listing.title}-${index}`}
                            {...listing} 
                        />
                    ))
                ) : (
                    <VStack className="items-center justify-center py-20">
                        <Text className="text-lg font-semibold text-gray-500 mb-2">
                            No properties found
                        </Text>
                        <Text className="text-sm text-gray-400 text-center">
                            Try adjusting your search criteria
                        </Text>
                    </VStack>
                )}
            </VStack>
        </VStack>
    );
};

export default ListingList; 