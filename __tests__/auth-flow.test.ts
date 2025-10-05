jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

import { signUpUser } from '../api/auth/sign-up';
import { loginUser } from '../api/auth/login';
import { db } from '@/utils/db';

describe('Create account and sign in flow', () => {
  const email = `e2e_${Date.now()}@example.com`;
  const password = 'password123';

  it('signs up owner and then logs in successfully', async () => {
    const signUp = await signUpUser({
      name: 'E2E Owner',
      email,
      contactNumber: '+631234567890',
      address: 'Lopez, Quezon',
      password,
      confirmPassword: password,
      role: 'owner',
    });

    expect(signUp.success).toBe(true);
    expect(signUp.role).toBe('owner');

    const users = await db.list<any>('users');
    expect(users.find(u => u.email === email)).toBeTruthy();

    const login = await loginUser({ email, password });
    expect(login.success).toBe(true);
    expect(login.user?.email).toBe(email);
  });
});


