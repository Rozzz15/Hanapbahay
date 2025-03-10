import { Pressable, Text, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

type ButtonProps = {
    isLoading?: boolean;
    text: string;
    onPress: () => void;
};

export function GradientButton({ isLoading, text, onPress }: ButtonProps) {
    return (
        <Pressable
            onPress={onPress}
            disabled={isLoading}
            className="w-full rounded-full overflow-hidden active:opacity-90 disabled:opacity-70"
        >
            <LinearGradient
                colors={['#2EEA4A', '#2E8B19']}
                className="flex-row items-center justify-center p-4 rounded-full"
            >
                {isLoading && <ActivityIndicator color="white" />}
                <Text className="text-white font-medium text-lg ml-2">{text}</Text>
            </LinearGradient>
        </Pressable>
    );
}
