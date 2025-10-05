jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
import AsyncStorage from '@react-native-async-storage/async-storage';
import { signUpUser } from '../api/auth/sign-up';
import { db } from '@/utils/db';

describe('Owner sign-up flow', () => {
  const uniqueEmail = `owner_${Date.now()}@example.com`;

  it('creates account and owner records', async () => {
    // Seed extras that the sign-up screen normally writes
    await AsyncStorage.setItem('owner_verification', JSON.stringify({ govIdUri: 'mock://gov-id.png' }));
    await AsyncStorage.setItem('owner_payment', JSON.stringify({ paymentMethods: ['gcash'] }));

    const result = await signUpUser({
      name: 'Owner Test',
      email: uniqueEmail,
      contactNumber: '+631234567890',
      address: 'Lopez, Quezon',
      password: 'password123',
      confirmPassword: 'password123',
      role: 'owner',
    });

    expect(result.success).toBe(true);
    expect(result.role).toBe('owner');

    const owners = await db.list<any>('owner_profiles');
    const found = owners.find((o) => o.email === uniqueEmail);
    expect(found).toBeTruthy();
  });
});


