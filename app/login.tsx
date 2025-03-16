import { useRouter } from 'expo-router';
import { VStack } from '@/components/ui/vstack';
import { Text } from '@/components/ui/text';
import { GradientButton } from '@/components/GradientButton';
import {
    FormControl,
    FormControlError,
    FormControlErrorText,
    FormControlErrorIcon,
    FormControlLabel,
    FormControlLabelText,
    FormControlHelper,
    FormControlHelperText,
} from "@/components/ui/form-control"
import { Input, InputField } from '@/components/ui/input';
import { AlertCircleIcon, Icon, ChevronLeftIcon } from "@/components/ui/icon"
import React from 'react';
import { Button } from '@/components/ui/button';

export default function LoginScreen() {
    const router = useRouter();
    const [isInvalid, setIsInvalid] = React.useState(false)
    const [inputValue, setInputValue] = React.useState("12345")
    const handleSubmit = () => {
        if (inputValue.length < 6) {
            setIsInvalid(true)
        } else {
            setIsInvalid(false)
        }
    }

    return (
        <VStack className="px-6 py-10 items-start">
            <Button className='pr-5' variant='link' size='xl' onPress={() => router.navigate('/')}><Icon as={ChevronLeftIcon} size='xl' /></Button>
            <Text size="3xl" className="font-bold text-gray-800 my-2">
                Welcome Back!
            </Text>
            <Text size="lg">Log in to your account to explore the best</Text>
            <Text size="lg">boarding houses and apartments across Lopez!</Text>
            
            <FormControl
                isInvalid={isInvalid}
                size="md"
                isDisabled={false}
                isReadOnly={false}
                isRequired={false}
                className='mt-10 w-full'
            >
                {/* Email field */}
                <FormControlLabel>
                <FormControlLabelText size='lg'>Email</FormControlLabelText>
                </FormControlLabel>
                <Input className="my-1" size="2xl" variant="rounded">
                    <InputField
                        type="password"
                        placeholder="password"
                        value={inputValue}
                        onChangeText={(text) => setInputValue(text)}
                    />
                </Input>
                <FormControlHelper>
                <FormControlHelperText size='lg'>
                    Must be atleast 6 characters.
                </FormControlHelperText>
                </FormControlHelper>
                <FormControlError>
                    <FormControlErrorIcon as={AlertCircleIcon} />
                <FormControlErrorText>
                    Atleast 6 characters are required.
                </FormControlErrorText>
                </FormControlError>

                {/* Password field */}
                <FormControlLabel className='mt-5'>
                <FormControlLabelText size='lg'>Password</FormControlLabelText>
                </FormControlLabel>
                <Input className="my-1" size="2xl" variant="rounded">
                    <InputField
                        type="password"
                        placeholder="password"
                        value={inputValue}
                        onChangeText={(text) => setInputValue(text)}
                    />
                </Input>
                <FormControlHelper>
                <FormControlHelperText size='lg'>
                    Must be atleast 6 characters.
                </FormControlHelperText>
                </FormControlHelper>
                <FormControlError>
                    <FormControlErrorIcon as={AlertCircleIcon} />
                <FormControlErrorText>
                    Atleast 6 characters are required.
                </FormControlErrorText>
                </FormControlError>
            </FormControl>

            <VStack className='mt-10 w-full'>
                <GradientButton
                    isLoading={false}
                    text="Login"
                    onPress={() => router.replace('/(tabs)')}
                ></GradientButton>
            </VStack>
        </VStack>
    );
}

