import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import LoginModal from '@/components/LoginModal';

export default function LoginScreen() {
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

    const handleLoginSuccess = () => {
        // Navigation is handled by the modal's internal logic
        setShowModal(false);
    };

    const handleSwitchToSignUp = () => {
        setShowModal(false);
        router.push('/sign-up');
    };

    return (
        <LoginModal
            visible={showModal}
            onClose={handleClose}
            onLoginSuccess={handleLoginSuccess}
            onSwitchToSignUp={handleSwitchToSignUp}
        />
    );
}
