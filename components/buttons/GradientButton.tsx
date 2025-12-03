import { Pressable, Text, ActivityIndicator, Animated, StyleSheet, ViewStyle, TextStyle } from 'react-native';
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

    const getButtonStyles = (): ViewStyle[] => {
        return [
            styles.buttonBase,
            styles[size],
        ];
    };

    const getTextStyles = (): TextStyle[] => {
        return [
            styles.textBase,
            styles[`${size}Text` as keyof typeof styles] as TextStyle
        ];
    };

    const getGradientColors = () => {
        switch (variant) {
            case 'primary':
                return ['#3B82F6', '#1D4ED8'];
            case 'secondary':
                return ['#10B981', '#059669'];
            case 'outline':
                return ['transparent', 'transparent'];
            default:
                return ['#3B82F6', '#1D4ED8'];
        }
    };

    const getTextColor = () => {
        switch (variant) {
            case 'outline':
                return '#374151';
            default:
                return '#FFFFFF';
        }
    };

    if (variant === 'outline') {
        return (
            <Animated.View
                style={[
                    {
                        transform: [{ scale: scaleAnim }],
                        opacity: opacityAnim,
                    },
                    styles.shadowSm,
                ]}
            >
                <Pressable
                    onPress={onPress}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                    disabled={isLoading}
                    style={[
                        ...getButtonStyles(),
                        styles.outlineBorder,
                        isLoading && styles.disabled,
                    ]}
                >
                    <LinearGradient
                        colors={getGradientColors() as any}
                        style={styles.gradientContent}
                    >
                        {isLoading && <ActivityIndicator color="#3B82F6" size="small" />}
                        <Text style={[
                            ...getTextStyles(),
                            { color: getTextColor() },
                            isLoading && styles.textWithLoader
                        ]}>
                            {text}
                        </Text>
                    </LinearGradient>
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
                styles.shadowLg,
            ]}
        >
            <Pressable
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={isLoading}
                style={[
                    ...getButtonStyles(),
                    isLoading && styles.disabled,
                ]}
            >
                <LinearGradient
                    colors={getGradientColors() as any}
                    style={styles.gradientContent}
                >
                    {isLoading && <ActivityIndicator color="white" size="small" />}
                    <Text style={[
                        ...getTextStyles(),
                        { color: getTextColor() },
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
        width: '100%',
        borderRadius: 16,
        overflow: 'hidden',
    },
    sm: {
        paddingVertical: 12,
        paddingHorizontal: 24,
    },
    md: {
        paddingVertical: 16,
        paddingHorizontal: 32,
    },
    lg: {
        paddingVertical: 20,
        paddingHorizontal: 32,
    },
    textBase: {
        fontWeight: '600',
        textAlign: 'center',
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
    gradientContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 16,
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
    shadowSm: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
        elevation: 2,
    },
    outlineBorder: {
        borderWidth: 2,
        borderColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
    },
});
