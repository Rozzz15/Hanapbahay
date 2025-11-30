// Web stub for react-native-worklets - this module doesn't work on web

export class WorkletsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WorkletsError';
  }
}

export const createSerializableObject = () => ({});
export const createSerializable = () => ({});

export default {
  WorkletsError,
  createSerializableObject,
  createSerializable,
};

