import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import { ScrollView, View, useWindowDimensions, StyleSheet } from 'react-native';
import ListingCard, { ListingType } from './ListingCard';

interface ListingCarouselProps {
    listings: ListingType[];
    gap?: number;
    onScroll?: (event: any) => void;
    onRef?: (ref: { scrollToNext: () => void }) => void;
}

const ListingCarousel: React.FC<ListingCarouselProps> = ({ listings, gap = 16, onScroll, onRef }) => {
    const { width } = useWindowDimensions();
    const isMobile = width < 768;
    const scrollViewRef = useRef<ScrollView>(null);
    
    // Calculate widths to show 20% of next card for better scrolling
    const baseWidth = isMobile ? width - 32 : 320;
    const cardWidth = Math.floor(baseWidth * 0.8); // Show 80% of the calculated width
    
    // Expose scroll methods to parent component
    React.useEffect(() => {
        if (onRef) {
            onRef({
                scrollToNext: () => {
                    if (scrollViewRef.current) {
                        scrollViewRef.current.scrollTo({
                            x: cardWidth + gap,
                            animated: true
                        });
                    }
                }
            });
        }
    }, [onRef, cardWidth, gap]);

    return (
        <ScrollView
            ref={scrollViewRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.scrollView}
            contentContainerStyle={{
                paddingHorizontal: 4,
                gap: gap,
            }}
            snapToInterval={cardWidth + gap}
            decelerationRate="fast"
            bounces={false}
            scrollEventThrottle={16}
            pagingEnabled={false}
            directionalLockEnabled={true}
            alwaysBounceHorizontal={false}
            alwaysBounceVertical={false}
            onScroll={onScroll}
        >
            {listings.map((listing, index) => (
                <View 
                    key={index} 
                    style={[
                        styles.cardContainer,
                        { 
                            width: cardWidth,
                            marginRight: index === listings.length - 1 ? 16 : 0,
                        }
                    ]}
                >
                    <ListingCard {...listing} />
                </View>
            ))}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    scrollView: {
        width: '100%',
    },
    cardContainer: {
        height: 180,
    },
});

export default ListingCarousel; 