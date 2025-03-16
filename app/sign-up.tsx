import { useRouter } from 'expo-router';
import { VStack } from '@/components/ui/vstack';
import { Text } from '@/components/ui/text';
import { GradientButton } from '@/components/GradientButton';

export default function SignUpScreen() {
    const router = useRouter();

    return (
        <VStack className="p-6">
            <Text>Let's explore together!</Text>
            <Text>Create your account to explore your dream place</Text>
            <Text>across Lopez!</Text>
            
            <GradientButton isLoading={false} text="Sign Up" onPress={() => router.replace('/(tabs)')}></GradientButton>
        </VStack>
    );
}

