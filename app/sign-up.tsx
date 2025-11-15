import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import SignUpModal from '@/components/SignUpModal';

export default function SignUpScreen() {
    const router = useRouter();
    const [showModal, setShowModal] = useState(true);

    const handleClose = () => {
        setShowModal(false);
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace('/');
        }
    };

    const handleSignUpSuccess = () => {
        // Navigation is handled by the modal's internal logic
        setShowModal(false);
    };

    const handleSwitchToLogin = () => {
        setShowModal(false);
        router.push('/login');
    };

    return (
        <SignUpModal
            visible={showModal}
            onClose={handleClose}
            onSignUpSuccess={handleSignUpSuccess}
            onSwitchToLogin={handleSwitchToLogin}
        />
    );
}
