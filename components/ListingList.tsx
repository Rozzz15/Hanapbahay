import React from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import ListingCard, { ListingType } from './ListingCard';

interface ListingListProps {
    listings: ListingType[];
    gap?: number;
}

const ListingList: React.FC<ListingListProps> = ({ listings, gap = 16 }) => {
    const { width } = useWindowDimensions();
    const isMobile = width < 768;
    
    return (
        <ScrollView
            showsVerticalScrollIndicator={false}
            className="w-full"
            contentContainerStyle={{
                paddingHorizontal: 16,
                gap: gap,
            }}
        >
            {listings.map((listing, index) => (
                <View 
                    key={index} 
                    className="w-full"
                >
                    <ListingCard {...listing} />
                </View>
            ))}
        </ScrollView>
    );
};

export default ListingList; 