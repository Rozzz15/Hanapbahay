import { GradientButton, InteractiveButton } from '@/components/buttons';
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
    <VStack className="px-6 py-10 gap-4 bg-gray-50 h-full w-full items-center justify-center">
      <VStack className="w-full items-center relative">
        {/* Mobile Layout (1 column) */}
        <VStack className="gap-3 w-full max-w-sm md:hidden">
          <HStack className="gap-3 justify-center">
            <Image
              source={require("../assets/onboarding/h1.jpg")}
              className="h-24 w-20 rounded-xl shadow-md"
              alt="House image 1"
            />
            <Image
              source={require("../assets/onboarding/h2.jpg")}
              className="h-32 w-20 rounded-xl shadow-md"
              alt="House image 2"
            />
            <Image
              source={require("../assets/onboarding/h3.jpg")}
              className="h-28 w-20 rounded-xl shadow-md"
              alt="House image 3"
            />
          </HStack>
          <HStack className="gap-3 justify-center">
            <Image
              source={require("../assets/onboarding/h4.jpg")}
              className="h-28 w-20 rounded-xl shadow-md"
              alt="House image 4"
            />
            <Image
              source={require("../assets/onboarding/h5.jpg")}
              className="h-24 w-20 rounded-xl shadow-md"
              alt="House image 5"
            />
            <Image
              source={require("../assets/onboarding/h6.jpg")}
              className="h-32 w-20 rounded-xl shadow-md"
              alt="House image 6"
            />
          </HStack>
          <HStack className="gap-3 justify-center">
            <Image
              source={require("../assets/onboarding/h7.jpg")}
              className="h-28 w-20 rounded-xl shadow-md"
              alt="House image 7"
            />
            <Image
              source={require("../assets/onboarding/h8.jpg")}
              className="h-32 w-20 rounded-xl shadow-md"
              alt="House image 8"
            />
            <Image
              source={require("../assets/onboarding/h9.jpg")}
              className="h-24 w-20 rounded-xl shadow-md"
              alt="House image 9"
            />
          </HStack>
        </VStack>

        {/* Tablet Layout (2 columns) */}
        <HStack className="gap-6 justify-center items-center hidden md:flex lg:hidden">
          <VStack className="gap-4">
            <Image
              source={require("../assets/onboarding/h1.jpg")}
              className="h-32 w-24 rounded-xl shadow-lg"
              alt="House image 1"
            />
            <Image
              source={require("../assets/onboarding/h2.jpg")}
              className="h-40 w-24 rounded-xl shadow-lg"
              alt="House image 2"
            />
            <Image
              source={require("../assets/onboarding/h3.jpg")}
              className="h-36 w-24 rounded-xl shadow-lg"
              alt="House image 3"
            />
          </VStack>
          <VStack className="gap-4">
            <Image
              source={require("../assets/onboarding/h4.jpg")}
              className="h-36 w-24 rounded-xl shadow-lg"
              alt="House image 4"
            />
            <Image
              source={require("../assets/onboarding/h5.jpg")}
              className="h-32 w-24 rounded-xl shadow-lg"
              alt="House image 5"
            />
            <Image
              source={require("../assets/onboarding/h6.jpg")}
              className="h-40 w-24 rounded-xl shadow-lg"
              alt="House image 6"
            />
          </VStack>
          <VStack className="gap-4">
            <Image
              source={require("../assets/onboarding/h7.jpg")}
              className="h-36 w-24 rounded-xl shadow-lg"
              alt="House image 7"
            />
            <Image
              source={require("../assets/onboarding/h8.jpg")}
              className="h-40 w-24 rounded-xl shadow-lg"
              alt="House image 8"
            />
            <Image
              source={require("../assets/onboarding/h9.jpg")}
              className="h-32 w-24 rounded-xl shadow-lg"
              alt="House image 9"
            />
          </VStack>
        </HStack>

        {/* Desktop Layout (3 columns) */}
        <HStack className="gap-8 justify-center items-center hidden lg:flex">
          <VStack className="gap-6">
            <Image
              source={require("../assets/onboarding/h1.jpg")}
              className="h-32 w-28 rounded-2xl shadow-xl"
              alt="House image 1"
            />
            <Image
              source={require("../assets/onboarding/h2.jpg")}
              className="h-48 w-28 rounded-2xl shadow-xl"
              alt="House image 2"
            />
            <Image
              source={require("../assets/onboarding/h3.jpg")}
              className="h-40 w-28 rounded-2xl shadow-xl"
              alt="House image 3"
            />
          </VStack>
          <VStack className="gap-6">
            <Image
              source={require("../assets/onboarding/h4.jpg")}
              className="h-40 w-28 rounded-2xl shadow-xl"
              alt="House image 4"
            />
            <Image
              source={require("../assets/onboarding/h5.jpg")}
              className="h-32 w-28 rounded-2xl shadow-xl"
              alt="House image 5"
            />
            <Image
              source={require("../assets/onboarding/h6.jpg")}
              className="h-48 w-28 rounded-2xl shadow-xl"
              alt="House image 6"
            />
          </VStack>
          <VStack className="gap-6">
            <Image
              source={require("../assets/onboarding/h7.jpg")}
              className="h-40 w-28 rounded-2xl shadow-xl"
              alt="House image 7"
            />
            <Image
              source={require("../assets/onboarding/h8.jpg")}
              className="h-48 w-28 rounded-2xl shadow-xl"
              alt="House image 8"
            />
            <Image
              source={require("../assets/onboarding/h9.jpg")}
              className="h-32 w-28 rounded-2xl shadow-xl"
              alt="House image 9"
            />
          </VStack>
        </HStack>

        {/* Fading Overlay */}
        <LinearGradient
          colors={['transparent', 'rgba(249,250,251,1)']}
          locations={[0, 0.85]}
          className="absolute bottom-0 w-full h-[25%]"
        />
      </VStack>
      <VStack className="gap-6 px-4 items-center justify-center">
        <Center className="mb-6">
          <VStack className="items-center">
            <Text size="3xl" className="font-bold text-gray-800 text-center">
              New Place, New Home
            </Text>
            <Text size="lg" className="text-gray-800 text-center mt-2">
              Ready to start fresh in a new place?
            </Text>
            <Text size="lg" className="text-gray-800 text-center">
              HanapBahay is here to guide you on your journey!
            </Text>
          </VStack>
        </Center>
        <VStack className="gap-4 w-full items-center">
          <InteractiveButton 
            isLoading={false} 
            text="Sign In" 
            onPress={() => router.replace('/login')}
            variant="primary"
            size="lg"
            fullWidth={false}
          />
          <InteractiveButton
            isLoading={false} 
            text="Create Account" 
            onPress={() => router.replace('/sign-up')}
            variant="outline"
            size="lg"
            fullWidth={false}
          />
        </VStack>
      </VStack>
    </VStack>
  );
}
