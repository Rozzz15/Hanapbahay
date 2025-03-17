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
} from "@/components/ui/form-control";
import { Input, InputField } from '@/components/ui/input';
import { AlertCircleIcon, Icon, ChevronLeftIcon } from "@/components/ui/icon";
import React from 'react';
import { Button } from '@/components/ui/button';
import { signUpUser, signUpSchema } from '@/api/auth/sign-up';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast, Toast, ToastTitle, ToastDescription } from "@/components/ui/toast";

export default function SignUpScreen() {
    const router = useRouter();
    const toast = useToast();

    // React Hook Form with Zod validation
    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors, isSubmitting },
    } = useForm({
        resolver: zodResolver(signUpSchema),
    });

    const onSubmit = async (data: any) => {
        try {
            await signUpUser(data);

            // Show success toast
            toast.show({
                placement: "top",
                render: ({ id }) => (
                    <Toast nativeID={id} action="success">
                        <ToastTitle>Sign-up successful!</ToastTitle>
                        <ToastDescription>Welcome aboard! 🎉</ToastDescription>
                    </Toast>
                ),
            });

            router.replace("/login"); // Redirect to login page
        } catch (error) {
            let errorMessage = "An unexpected error occurred";

            if (error instanceof Error) {
                errorMessage = error.message;
            }

            // Show error toast
            toast.show({
                placement: "top",
                render: ({ id }) => (
                    <Toast nativeID={id} action="error">
                        <ToastTitle>Sign-up failed</ToastTitle>
                        <ToastDescription>{errorMessage}</ToastDescription>
                    </Toast>
                ),
            });
        }
    };

    return (
        <VStack className="px-6 py-10 items-start">
            {/* Back Button */}
            <Button className='pr-5' variant='link' size='xl' onPress={() => router.navigate('/')}>
                <Icon as={ChevronLeftIcon} size='xl' />
            </Button>

            {/* Header */}
            <Text size="3xl" className="font-bold text-gray-800 my-2">Let's explore together!</Text>
            <Text size='lg'>Create your account to explore your dream place</Text>
            <Text size='lg'>across Lopez!</Text>

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
                        <FormControlErrorText>{errors.email?.message as string}</FormControlErrorText>
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
                        <FormControlErrorText>{errors.password?.message as string}</FormControlErrorText>
                    </FormControlError>
                )}
            </FormControl>

            {/* Confirm Password Field */}
            <FormControl isInvalid={!!errors.confirmPassword} className='mt-5 w-full'>
                <FormControlLabel>
                    <FormControlLabelText size='lg'>Confirm Password</FormControlLabelText>
                </FormControlLabel>
                <Input className="my-1" size="2xl" variant="rounded">
                    <InputField
                        type="password"
                        placeholder="confirm password"
                        {...register("confirmPassword")}
                        onChangeText={(text) => setValue("confirmPassword", text)}
                    />
                </Input>
                {errors.confirmPassword && (
                    <FormControlError>
                        <FormControlErrorIcon as={AlertCircleIcon} />
                        <FormControlErrorText>{errors.confirmPassword?.message as string}</FormControlErrorText>
                    </FormControlError>
                )}
            </FormControl>

            <VStack className='mt-10 w-full'>
                <GradientButton
                    isLoading={isSubmitting}
                    text="Sign Up"
                    onPress={handleSubmit(onSubmit)}
                />
            </VStack>
        </VStack>
    );
}
