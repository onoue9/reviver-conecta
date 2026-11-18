import { Environment } from './environment.model';

/**
 * Template for `environment.ts` (which is git-ignored).
 *
 * `npm start`, `npm run build` and `npm test` copy this file to `environment.ts`
 * automatically when it does not exist. The `demo-` project id lets the Firebase
 * Emulator Suite run without a real Firebase project. To point at a real project,
 * replace the values below in your local `environment.ts` only — never commit keys.
 */
export const environment: Environment = {
  production: false,
  useEmulators: true,
  firebase: {
    apiKey: 'demo-api-key',
    authDomain: 'demo-reviver-conecta.firebaseapp.com',
    projectId: 'demo-reviver-conecta',
    storageBucket: 'demo-reviver-conecta.appspot.com',
    messagingSenderId: '000000000000',
    appId: '1:000000000000:web:0000000000000000',
  },
};
