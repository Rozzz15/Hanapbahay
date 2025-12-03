import { Pressable, Text, ActivityIndicator, Animated, View, StyleSheet, ViewStyle, TextStyle } from 'react-native';
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

    const getButtonStyles = (): ViewStyle[] => {
        const baseStyles: ViewStyle[] = [
            styles.buttonBase,
            styles[size],
            fullWidth ? styles.fullWidth : styles.autoWidth
        ];
        
        return baseStyles;
    };

    const getTextStyles = (): TextStyle[] => {
        const baseTextStyles: TextStyle[] = [
            styles.textBase,
            styles[`${size}Text` as keyof typeof styles] as TextStyle
        ];
        
        return baseTextStyles;
    };

    const getVariantStyles = () => {
        switch (variant) {
            case 'primary':
                return {
                    gradient: ['#16a34a', '#15803d'],
                    textColor: '#FFFFFF',
                    shadow: styles.shadowLg,
                    border: styles.primaryBorder
                };
            case 'secondary':
                return {
                    gradient: ['#3b82f6', '#2563eb'],
                    textColor: '#FFFFFF',
                    shadow: styles.shadowLg,
                    border: styles.secondaryBorder
                };
            case 'outline':
                return {
                    gradient: ['transparent', 'transparent'],
                    textColor: '#16a34a',
                    shadow: styles.shadowMd,
                    border: styles.outlineBorder
                };
            case 'ghost':
                return {
                    gradient: ['transparent', 'transparent'],
                    textColor: '#4B5563',
                    shadow: styles.shadowNone,
                    border: styles.ghostBorder
                };
            default:
                return {
                    gradient: ['#16a34a', '#15803d'],
                    textColor: '#FFFFFF',
                    shadow: styles.shadowLg,
                    border: styles.primaryBorder
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
                style={[
                    {
                        transform: [{ scale: scaleAnim }],
                        opacity: opacityAnim,
                    },
                    variantStyles.shadow,
                ]}
            >
                <Pressable
                    onPress={onPress}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                    disabled={isLoading}
                    style={[
                        ...getButtonStyles(),
                        variantStyles.border,
                        isLoading && styles.disabled,
                    ]}
                >
                    <View style={styles.buttonContent}>
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
                        <Text style={[
                            ...getTextStyles(),
                            { color: variantStyles.textColor },
                            isLoading && styles.textWithLoader
                        ]}>
                            {text}
                        </Text>
                    </View>
                </Pressable>
            </Animated.View>
        );
    }

    return (
        <Animated.View
            style={[
                {
                    transform: [{ scale: scaleAnim }],
                    opacity: opacityAnim,
                },
                variantStyles.shadow,
            ]}
        >
            <Pressable
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={isLoading}
                style={[
                    ...getButtonStyles(),
                    variantStyles.border,
                    isLoading && styles.disabled,
                ]}
            >
                <LinearGradient
                    colors={variantStyles.gradient as any}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.gradientContent}
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
                    <Text style={[
                        ...getTextStyles(),
                        { color: variantStyles.textColor },
                        isLoading && styles.textWithLoader
                    ]}>
                        {text}
                    </Text>
                </LinearGradient>
            </Pressable>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    buttonBase: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    fullWidth: {
        width: 320,
        maxWidth: 384,
        alignSelf: 'center',
    },
    autoWidth: {
        width: 320,
        alignSelf: 'center',
    },
    sm: {
        paddingVertical: 12,
        paddingHorizontal: 32,
    },
    md: {
        paddingVertical: 16,
        paddingHorizontal: 48,
    },
    lg: {
        paddingVertical: 20,
        paddingHorizontal: 64,
    },
    textBase: {
        fontWeight: '600',
        textAlign: 'center',
        letterSpacing: 0.5,
    },
    smText: {
        fontSize: 14,
    },
    mdText: {
        fontSize: 16,
    },
    lgText: {
        fontSize: 18,
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 16,
        position: 'relative',
    },
    gradientContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 16,
        position: 'relative',
        width: '100%',
        height: '100%',
    },
    disabled: {
        opacity: 0.7,
    },
    textWithLoader: {
        marginLeft: 8,
    },
    shadowLg: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    shadowMd: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
    shadowNone: {
        shadowColor: 'transparent',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0,
        shadowRadius: 0,
        elevation: 0,
    },
    primaryBorder: {
        borderWidth: 2,
        borderColor: '#16a34a',
        backgroundColor: '#16a34a',
    },
    secondaryBorder: {
        borderWidth: 2,
        borderColor: '#3b82f6',
        backgroundColor: '#3b82f6',
    },
    outlineBorder: {
        borderWidth: 2,
        borderColor: '#16a34a',
        backgroundColor: '#FFFFFF',
    },
    ghostBorder: {
        borderWidth: 1,
        borderColor: '#E5E7EB',
        backgroundColor: '#F9FAFB',
    },
});
