// Mock react-native-reanimated and other RN modules commonly needed
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

// Silence warnings that can break tests
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
}));


