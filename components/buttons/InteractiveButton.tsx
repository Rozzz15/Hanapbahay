import { Pressable, Text, ActivityIndicator, Animated, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';

type InteractiveButtonProps = {
    isLoading?: boolean;
    text: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    fullWidth?: boolean;
};

export function InteractiveButton({ 
    isLoading, 
    text, 
    onPress, 
    variant = 'primary',
    size = 'lg',
    fullWidth = true
}: InteractiveButtonProps) {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const opacityAnim = useRef(new Animated.Value(1)).current;
    const shadowAnim = useRef(new Animated.Value(0)).current;
    const rippleAnim = useRef(new Animated.Value(0)).current;
    const rippleOpacity = useRef(new Animated.Value(0)).current;

    const getButtonStyles = () => {
        const baseStyles = "rounded-2xl overflow-hidden active:opacity-90 disabled:opacity-70 shadow-lg";
        const widthStyles = fullWidth ? "w-80 max-w-sm mx-auto" : "w-80 mx-auto";
        
        const sizeStyles = {
            sm: "py-3 px-8",
            md: "py-4 px-12", 
            lg: "py-5 px-16"
        };
        
        return `${baseStyles} ${widthStyles} ${sizeStyles[size]}`;
    };

    const getTextStyles = () => {
        const baseTextStyles = "font-semibold text-center tracking-wide";
        
        const sizeTextStyles = {
            sm: "text-sm",
            md: "text-base", 
            lg: "text-lg"
        };
        
        return `${baseTextStyles} ${sizeTextStyles[size]}`;
    };

    const getVariantStyles = () => {
        switch (variant) {
            case 'primary':
                return {
                    gradient: ['#16a34a', '#15803d'],
                    textColor: 'text-white',
                    shadow: 'shadow-lg',
                    border: 'border-2 border-green-600 bg-green-600'
                };
            case 'secondary':
                return {
                    gradient: ['#3b82f6', '#2563eb'],
                    textColor: 'text-white',
                    shadow: 'shadow-lg',
                    border: 'border-2 border-blue-600 bg-blue-600'
                };
            case 'outline':
                return {
                    gradient: ['transparent', 'transparent'],
                    textColor: 'text-green-600',
                    shadow: 'shadow-md',
                    border: 'border-2 border-green-600 bg-white'
                };
            case 'ghost':
                return {
                    gradient: ['transparent', 'transparent'],
                    textColor: 'text-gray-600',
                    shadow: 'shadow-none',
                    border: 'border border-gray-200 bg-gray-50'
                };
            default:
                return {
                    gradient: ['#16a34a', '#15803d'],
                    textColor: 'text-white',
                    shadow: 'shadow-lg',
                    border: 'border-2 border-green-600 bg-green-600'
                };
        }
    };

    const handlePressIn = () => {
        // Scale down animation
        Animated.parallel([
            Animated.timing(scaleAnim, {
                toValue: 0.95,
                duration: 100,
                useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
                toValue: 0.9,
                duration: 100,
                useNativeDriver: true,
            }),
            Animated.timing(shadowAnim, {
                toValue: 1,
                duration: 100,
                useNativeDriver: true,
            }),
        ]).start();

        // Ripple effect
        Animated.parallel([
            Animated.timing(rippleAnim, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(rippleOpacity, {
                toValue: 0.3,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start();
    };

    const handlePressOut = () => {
        // Scale back up animation
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

        // Reset ripple
        Animated.parallel([
            Animated.timing(rippleAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(rippleOpacity, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start();
    };

    const variantStyles = getVariantStyles();

    if (variant === 'outline' || variant === 'ghost') {
        return (
            <Animated.View
                style={{
                    transform: [{ scale: scaleAnim }],
                    opacity: opacityAnim,
                    boxShadow: `0 4px 8px rgba(0, 0, 0, ${shadowAnim})`,
                }}
            >
                <Pressable
                    onPress={onPress}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                    disabled={isLoading}
                    className={`${getButtonStyles()} ${variantStyles.shadow} ${variantStyles.border}`}
                >
                    <View className="flex-row items-center justify-center rounded-2xl relative">
                        {/* Ripple effect overlay */}
                        <Animated.View
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                backgroundColor: 'rgba(107, 114, 128, 0.1)',
                                opacity: rippleOpacity,
                                transform: [{ scale: rippleAnim }],
                                borderRadius: 16,
                            }}
                        />
                        {isLoading && <ActivityIndicator color="#374151" size="small" />}
                        <Text className={`${getTextStyles()} ${variantStyles.textColor} ${isLoading ? 'ml-2' : ''} relative z-10`}>
                            {text}
                        </Text>
                    </View>
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
                className={`${getButtonStyles()} ${variantStyles.border}`}
            >
                <LinearGradient
                    colors={variantStyles.gradient as any}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    className="flex-row items-center justify-center rounded-2xl relative"
                >
                    {/* Ripple effect overlay */}
                    <Animated.View
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(255, 255, 255, 0.2)',
                            opacity: rippleOpacity,
                            transform: [{ scale: rippleAnim }],
                            borderRadius: 16,
                        }}
                    />
                    {isLoading && <ActivityIndicator color="#FFFFFF" size="small" />}
                    <Text className={`${getTextStyles()} ${variantStyles.textColor} ${isLoading ? 'ml-2' : ''} relative z-10`}>
                        {text}
                    </Text>
                </LinearGradient>
            </Pressable>
        </Animated.View>
    );
}
