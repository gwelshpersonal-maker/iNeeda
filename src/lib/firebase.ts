import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  initializeFirestore, 
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase SDK
const app = initializeApp(firebaseConfig);

// Initialize Firestore with settings optimized for restricted networks.
// experimentalForceLongPolling: true is essential for environments where WebSockets/gRPC might be blocked.
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  host: 'firestore.googleapis.com',
  ssl: true,
}, firebaseConfig.firestoreDatabaseId);

export const auth = getAuth(app);

console.log(`[Firebase] Initialized with Project: ${firebaseConfig.projectId}, Database: ${firebaseConfig.firestoreDatabaseId || '(default)'}`);

export default app;
