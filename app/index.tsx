import { GradientButton } from '@/components/GradientButton';
import { OutlineButton } from '@/components/OutlineButton';
import { Image } from '@/components/ui/image';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { useRouter } from 'expo-router';
import { Text } from '@/components/ui/text';
import { Center } from '@/components/ui/center';
import { LinearGradient } from 'expo-linear-gradient';

export default function OnboardingScreen() {
  const router = useRouter();

  return (
    <VStack className="px-6 py-10 gap-4 bg-white h-full w-full">
      <HStack className="gap-4 justify-center items-center">
        <VStack className="gap-4">
          <Image
            source={require("../assets/onboarding/h1.jpg")}
            className="h-[120px] w-[100px] rounded-lg"
            alt="House image 1"
          />
          <Image
            source={require("../assets/onboarding/h2.jpg")}
            className="h-[200px] w-[100px] rounded-lg"
            alt="House image 2"
          />
          <Image
            source={require("../assets/onboarding/h3.jpg")}
            className="h-[180px] w-[100px] rounded-lg"
            alt="House image 3"
          />
        </VStack>
        <VStack className="gap-4">
          <Image
            source={require("../assets/onboarding/h4.jpg")}
            className="h-[150px] w-[100px] rounded-lg"
            alt="House image 4"
          />
          <Image
            source={require("../assets/onboarding/h5.jpg")}
            className="h-[150px] w-[100px] rounded-lg"
            alt="House image 5"
          />
          <Image
            source={require("../assets/onboarding/h6.jpg")}
            className="h-[200px] w-[100px] rounded-lg"
            alt="House image 6"
          />
        </VStack>
        <VStack className="gap-4">
          <Image
            source={require("../assets/onboarding/h7.jpg")}
            className="h-[150px] w-[100px] rounded-lg"
            alt="House image 7"
          />
          <Image
            source={require("../assets/onboarding/h8.jpg")}
            className="h-[200px] w-[100px] rounded-lg"
            alt="House image 8"
          />
          <Image
            source={require("../assets/onboarding/h9.jpg")}
            className="h-[150px] w-[100px] rounded-lg"
            alt="House image 9"
          />
        </VStack>

        {/* Fading Overlay */}
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,1)']}
          locations={[0, 0.85]}
          className="absolute bottom-0 w-full h-[25%]"
        />
      </HStack>
      <VStack className="gap-4">
        <Center className="mb-4">
          <Text size="3xl" className="font-bold text-gray-800">
            New Place, New Home
          </Text>
          <Text size="lg" className="text-gray-800 text-center">
            Ready to start fresh in a new place?
          </Text>
          <Text size="lg" className="text-gray-800 text-center">
            HanapBahay is here to guide you on your journey!
          </Text>
        </Center>
        <GradientButton 
          isLoading={false} 
          text="Login" 
          onPress={() => router.replace('/login')}
        />
        <OutlineButton
          isLoading={false} 
          text="Sign Up" 
          onPress={() => router.replace('/sign-up')}
        ></OutlineButton>
      </VStack>
    </VStack>
  );
}
