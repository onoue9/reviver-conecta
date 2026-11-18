import { EnvironmentProviders } from '@angular/core';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { connectAuthEmulator, getAuth, provideAuth } from '@angular/fire/auth';
import {
  connectFirestoreEmulator,
  getFirestore,
  provideFirestore,
} from '@angular/fire/firestore';

import { environment } from '../environments/environment';

export const EMULATOR_HOST = '127.0.0.1';
export const AUTH_EMULATOR_PORT = 9099;
export const FIRESTORE_EMULATOR_PORT = 8080;

export function provideFirebase(): EnvironmentProviders[] {
  return [
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideAuth(() => {
      const auth = getAuth();
      if (environment.useEmulators) {
        connectAuthEmulator(auth, `http://${EMULATOR_HOST}:${AUTH_EMULATOR_PORT}`, {
          disableWarnings: true,
        });
      }
      return auth;
    }),
    provideFirestore(() => {
      const firestore = getFirestore();
      if (environment.useEmulators) {
        connectFirestoreEmulator(firestore, EMULATOR_HOST, FIRESTORE_EMULATOR_PORT);
      }
      return firestore;
    }),
  ];
}
