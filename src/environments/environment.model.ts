import { FirebaseOptions } from 'firebase/app';

export interface Environment {
  production: boolean;
  /** When true, Auth and Firestore connect to the local Firebase Emulator Suite. */
  useEmulators: boolean;
  firebase: FirebaseOptions;
}
