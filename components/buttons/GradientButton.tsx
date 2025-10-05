import { Pressable, Text, ActivityIndicator, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';

type ButtonProps = {
    isLoading?: boolean;
    text: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'outline';
    size?: 'sm' | 'md' | 'lg';
};

export function GradientButton({ 
    isLoading, 
    text, 
    onPress, 
    variant = 'primary',
    size = 'lg'
}: ButtonProps) {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const opacityAnim = useRef(new Animated.Value(1)).current;
    const shadowAnim = useRef(new Animated.Value(0)).current;

    const handlePressIn = () => {
        Animated.parallel([
            Animated.timing(scaleAnim, {
                toValue: 0.95,
                duration: 100,
                useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
                toValue: 0.8,
                duration: 100,
                useNativeDriver: true,
            }),
            Animated.timing(shadowAnim, {
                toValue: 1,
                duration: 100,
                useNativeDriver: true,
            }),
        ]).start();
    };

    const handlePressOut = () => {
        Animated.parallel([
            Animated.timing(scaleAnim, {
                toValue: 1,
                duration: 150,
                useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
                toValue: 1,
                duration: 150,
                useNativeDriver: true,
            }),
            Animated.timing(shadowAnim, {
                toValue: 0,
                duration: 150,
                useNativeDriver: true,
            }),
        ]).start();
    };
    const getButtonStyles = () => {
        const baseStyles = "w-full rounded-2xl overflow-hidden active:opacity-90 disabled:opacity-70 shadow-lg";
        
        const sizeStyles = {
            sm: "py-3 px-6",
            md: "py-4 px-8", 
            lg: "py-5 px-8"
        };
        
        return `${baseStyles} ${sizeStyles[size]}`;
    };

    const getTextStyles = () => {
        const baseTextStyles = "font-semibold text-center";
        
        const sizeTextStyles = {
            sm: "text-sm",
            md: "text-base", 
            lg: "text-lg"
        };
        
        return `${baseTextStyles} ${sizeTextStyles[size]}`;
    };

    const getGradientColors = () => {
        switch (variant) {
            case 'primary':
                return ['#3B82F6', '#1D4ED8']; // Modern blue gradient
            case 'secondary':
                return ['#10B981', '#059669']; // Modern green gradient
            case 'outline':
                return ['transparent', 'transparent'];
            default:
                return ['#3B82F6', '#1D4ED8'];
        }
    };

    const getTextColor = () => {
        switch (variant) {
            case 'outline':
                return 'text-gray-700';
            default:
                return 'text-white';
        }
    };

    if (variant === 'outline') {
        return (
            <Animated.View
                style={{
                    transform: [{ scale: scaleAnim }],
                    opacity: opacityAnim,
                    shadowOpacity: shadowAnim,
                    shadowRadius: 8,
                    shadowOffset: { width: 0, height: 4 },
                    shadowColor: '#000',
                }}
            >
                <Pressable
                    onPress={onPress}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                    disabled={isLoading}
                    className={`${getButtonStyles()} border-2 border-gray-200 bg-white shadow-sm`}
                >
                    <LinearGradient
                        colors={getGradientColors()}
                        className="flex-row items-center justify-center rounded-2xl"
                    >
                        {isLoading && <ActivityIndicator color="#3B82F6" size="small" />}
                        <Text className={`${getTextStyles()} ${getTextColor()} ${isLoading ? 'ml-2' : ''}`}>
                            {text}
                        </Text>
                    </LinearGradient>
                </Pressable>
            </Animated.View>
        );
    }

    return (
        <Animated.View
            style={{
                transform: [{ scale: scaleAnim }],
                opacity: opacityAnim,
                shadowOpacity: shadowAnim,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 4 },
                shadowColor: '#000',
            }}
        >
            <Pressable
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={isLoading}
                className={getButtonStyles()}
            >
                <LinearGradient
                    colors={getGradientColors()}
                    className="flex-row items-center justify-center rounded-2xl"
                >
                    {isLoading && <ActivityIndicator color="white" size="small" />}
                    <Text className={`${getTextStyles()} ${getTextColor()} ${isLoading ? 'ml-2' : ''}`}>
                        {text}
                    </Text>
                </LinearGradient>
            </Pressable>
        </Animated.View>
    );
}
