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
} from "@/components/ui/form-control"
import { Input, InputField } from '@/components/ui/input';
import { AlertCircleIcon, Icon, ChevronLeftIcon } from "@/components/ui/icon"
import React from 'react';
import { Button } from '@/components/ui/button';
import { loginUser, loginSchema } from '@/api/auth/login';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

export default function LoginScreen() {
    const router = useRouter();

    // Use React Hook Form with Zod validation
    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors, isSubmitting },
    } = useForm({
        resolver: zodResolver(loginSchema),
    });

    const onSubmit = async (data: any) => {
        try {
            await loginUser(data);
            router.replace('/(tabs)'); // Navigate on success
        } catch (error) {
            alert("Invalid email or password");
        }
    };

    return (
        <VStack className="px-6 py-10 items-start">
            <Button className='pr-5' variant='link' size='xl' onPress={() => router.navigate('/')}>
                <Icon as={ChevronLeftIcon} size='xl' />
            </Button>
            <Text size="3xl" className="font-bold text-gray-800 my-2">
                Welcome Back!
            </Text>
            <Text size="lg">Log in to your account to explore the best</Text>
            <Text size="lg">boarding houses and apartments across Lopez!</Text>
            
            {/* Email Field */}
            <FormControl isInvalid={!!errors.email} className='mt-10 w-full'>
                <FormControlLabel>
                    <FormControlLabelText size='lg'>Email</FormControlLabelText>
                </FormControlLabel>
                <Input className="my-1" size="2xl" variant="rounded">
                    <InputField
                        type="text"
                        placeholder="email@example.com"
                        {...register("email")}
                        onChangeText={(text) => setValue("email", text)}
                    />
                </Input>
                {errors.email && (
                    <FormControlError>
                        <FormControlErrorIcon as={AlertCircleIcon} />
                        <FormControlErrorText>{errors.email.message}</FormControlErrorText>
                    </FormControlError>
                )}
            </FormControl>

            {/* Password Field */}
            <FormControl isInvalid={!!errors.password} className='mt-5 w-full'>
                <FormControlLabel>
                    <FormControlLabelText size='lg'>Password</FormControlLabelText>
                </FormControlLabel>
                <Input className="my-1" size="2xl" variant="rounded">
                    <InputField
                        type="password"
                        placeholder="password"
                        {...register("password")}
                        onChangeText={(text) => setValue("password", text)}
                    />
                </Input>
                {errors.password && (
                    <FormControlError>
                        <FormControlErrorIcon as={AlertCircleIcon} />
                        <FormControlErrorText>{errors.password.message}</FormControlErrorText>
                    </FormControlError>
                )}
            </FormControl>

            <VStack className='mt-10 w-full'>
                <GradientButton
                    isLoading={isSubmitting}
                    text="Login"
                    onPress={handleSubmit(onSubmit)}
                />
            </VStack>
        </VStack>
    );
}
