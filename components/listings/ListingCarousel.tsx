import React from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import ListingCard, { ListingType } from './ListingCard';

interface ListingCarouselProps {
    listings: ListingType[];
    gap?: number;
}

const ListingCarousel: React.FC<ListingCarouselProps> = ({ listings, gap = 16 }) => {
    const { width } = useWindowDimensions();
    const isMobile = width < 768;
    
    // Calculate widths to show 20% of next card for better scrolling
    const baseWidth = isMobile ? width - 32 : 320;
    const cardWidth = Math.floor(baseWidth * 0.8); // Show 80% of the calculated width

    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="w-full"
            contentContainerStyle={{
                paddingHorizontal: 4,
                gap: gap,
            }}
            snapToInterval={cardWidth + gap}
            decelerationRate="fast"
            bounces={false}
            scrollEventThrottle={16}
        >
            {listings.map((listing, index) => (
                <View 
                    key={index} 
                    style={{ 
                        width: cardWidth,
                        marginRight: index === listings.length - 1 ? 16 : 0, // Add padding to last item
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