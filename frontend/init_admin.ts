
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';

const requireEnv = (key: string): string => {
    const value = process.env[key];
    if (!value) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
};

const firebaseConfig = {
    apiKey: requireEnv('VITE_FIREBASE_API_KEY'),
    authDomain: requireEnv('VITE_FIREBASE_AUTH_DOMAIN'),
    projectId: requireEnv('VITE_FIREBASE_PROJECT_ID'),
    storageBucket: requireEnv('VITE_FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: requireEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
    appId: requireEnv('VITE_FIREBASE_APP_ID'),
    measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function promoteSiteAdmin() {
    const email = requireEnv('SITE_ADMIN_EMAIL');
    console.log(`Searching for Site Admin: ${email}`);
    const q = query(collection(db, 'users'), where('email', '==', email));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
        console.log("NOT FOUND. User must sign up first via the Auth page.");
    } else {
        const uid = snapshot.docs[0].id;
        await updateDoc(doc(db, 'users', uid), {
            role: 'SITE_ADMIN',
            lvl: 100
        });
        console.log(`SUCCESS: ${email} is now SITE_ADMIN (lvl 100)`);
    }
}

promoteSiteAdmin();
