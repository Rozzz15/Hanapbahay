import React from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import ListingCard, { ListingType } from './ListingCard';

interface ListingCarouselProps {
    listings: ListingType[];
    gap?: number;
}

const ListingCarousel: React.FC<ListingCarouselProps> = ({ listings, gap = 4 }) => {
    const { width } = useWindowDimensions();
    const isMobile = width < 768;
    
    // Calculate widths to show 10% of next card
    const baseWidth = isMobile ? width - 32 : 380;
    const cardWidth = Math.floor(baseWidth * 0.9); // Show 90% of the calculated width

    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="w-full"
            contentContainerStyle={{
                paddingHorizontal: 16,
                gap: gap,
            }}
            snapToInterval={cardWidth + gap}
            decelerationRate="fast"
        >
            {listings.map((listing, index) => (
                <View 
                    key={index} 
                    style={{ 
                        width: cardWidth,
                    }}
                    className="h-[180px]"
                >
                    <ListingCard {...listing} />
                </View>
            ))}
        </ScrollView>
    );
};

export default ListingCarousel; 