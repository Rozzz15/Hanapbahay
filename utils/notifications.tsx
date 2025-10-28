import React from 'react';
import { Toast, ToastTitle, ToastDescription } from '../components/ui/toast';

export interface NotificationConfig {
  title: string;
  description: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
  placement?: 'top' | 'bottom';
}

export const createNotification = (config: NotificationConfig) => {
  const {
    title,
    description,
    type,
    duration = 4000,
    placement = 'top'
  } = config;

  const getActionType = () => {
    switch (type) {
      case 'success': return 'success';
      case 'error': return 'error';
      case 'warning': return 'warning';
      case 'info': 
      default: return 'info';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': 
      default: return 'ℹ️';
    }
  };

  return {
    placement,
    duration,
    render: ({ id }: { id: string }) => (
      <Toast 
        style={{
          position: 'absolute',
          top: placement === 'top' ? 20 : undefined,
          bottom: placement === 'bottom' ? 20 : undefined,
          left: '50%',
          transform: [{ translateX: -150 }],
          zIndex: 9999,
          maxWidth: 300,
          width: '90%',
          minWidth: 300,
          borderRadius: 12,
          padding: 16,
          backgroundColor: 'white',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
          elevation: 8,
        }}
      >
        <ToastTitle style={{ fontSize: 18, fontWeight: '600', color: '#1F2937', marginBottom: 4 }}>
          {getIcon()} {title}
        </ToastTitle>
        <ToastDescription style={{ fontSize: 14, color: '#6B7280', lineHeight: 20 }}>
          {description}
        </ToastDescription>
      </Toast>
    ),
  };
};

// Predefined notification templates
export const notifications = {
  // Authentication
  loginSuccess: () => 'Welcome back! You\'ve successfully signed in. Ready to find your perfect home? 🏠',

  loginError: () => createNotification({
    title: 'Login Failed ❌',
    description: 'Invalid email or password. Please check your credentials and try again.',
    type: 'error',
    duration: 5000,
  }),

  logoutSuccess: () => 'You\'ve been logged out successfully. See you next time! 👋',

  // Profile Updates
  profileUpdateSuccess: () => createNotification({
    title: 'Profile Updated',
    description: 'Your personal information has been saved successfully.',
    type: 'success',
    duration: 3000,
  }),

  profileUpdateError: () => createNotification({
    title: 'Update Failed',
    description: 'Unable to save your changes. Please check your information and try again.',
    type: 'error',
    duration: 4000,
  }),

  // Validation Errors
  invalidEmail: () => createNotification({
    title: 'Invalid Email',
    description: 'Please enter a valid email address (e.g., user@example.com)',
    type: 'error',
    duration: 4000,
  }),

  invalidPhone: () => createNotification({
    title: 'Invalid Phone Number',
    description: 'Please enter a valid Philippine phone number starting with +63',
    type: 'error',
    duration: 4000,
  }),

  // Sign Up
  signupSuccess: () => createNotification({
    title: 'Account Created!',
    description: 'Welcome to HanapBahay! Your account has been created successfully. 🎉',
    type: 'success',
    duration: 5000,
  }),

  signupError: () => createNotification({
    title: 'Sign Up Failed',
    description: 'Unable to create your account. Please check your information and try again.',
    type: 'error',
    duration: 4000,
  }),

  // Property Owner
  listingSaved: () => createNotification({
    title: 'Listing Saved',
    description: 'Your property listing has been saved successfully.',
    type: 'success',
    duration: 3000,
  }),

  listingPublished: () => createNotification({
    title: 'Listing Published!',
    description: 'Your property is now live and visible to potential tenants! 🏡',
    type: 'success',
    duration: 5000,
  }),

  listingError: () => createNotification({
    title: 'Save Failed',
    description: 'Unable to save your listing. Please check your information and try again.',
    type: 'error',
    duration: 4000,
  }),

  // Booking
  bookingSuccess: (propertyTitle: string) => createNotification({
    title: 'Booking Confirmed! 🎉',
    description: `Your booking for "${propertyTitle}" has been submitted successfully. The property owner will review your request shortly.`,
    type: 'success',
    duration: 6000,
  }),

  bookingError: () => createNotification({
    title: 'Booking Failed',
    description: 'Unable to process your booking. Please check your information and try again.',
    type: 'error',
    duration: 4000,
  }),

  // General
  operationSuccess: (operation: string) => `${operation} completed successfully.`,

  operationError: (operation: string) => createNotification({
    title: 'Error',
    description: `Unable to ${operation.toLowerCase()}. Please try again.`,
    type: 'error',
    duration: 4000,
  }),

  // Data Management
  dataCleared: () => createNotification({
    title: 'Data Cleared',
    description: 'All stored data has been cleared successfully.',
    type: 'info',
    duration: 3000,
  }),

  dataLoadError: () => createNotification({
    title: 'Loading Failed',
    description: 'Unable to load your data. Please refresh the page and try again.',
    type: 'error',
    duration: 4000,
  }),

  // Password Reset
  passwordResetEmailSent: () => createNotification({
    title: 'Reset Email Sent! 📧',
    description: 'Check your email for password reset instructions. The link will expire in 1 hour.',
    type: 'success',
    duration: 5000,
  }),

  passwordResetEmailNotFound: () => createNotification({
    title: 'Email Not Found',
    description: 'This email address is not registered in our system. Please check your email or create a new account.',
    type: 'error',
    duration: 5000,
  }),

  passwordResetFailed: () => createNotification({
    title: 'Reset Failed',
    description: 'Unable to send password reset email. Please try again later.',
    type: 'error',
    duration: 4000,
  }),

  passwordResetSuccess: () => createNotification({
    title: 'Password Reset Success! 🔐',
    description: 'Your password has been updated successfully. You can now sign in with your new password.',
    type: 'success',
    duration: 5000,
  }),

  passwordResetTokenInvalid: () => createNotification({
    title: 'Invalid Reset Link',
    description: 'This password reset link is invalid or has expired. Please request a new password reset.',
    type: 'error',
    duration: 5000,
  }),
};
