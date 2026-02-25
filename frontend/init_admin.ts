
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyDTVI6zp6HYffeEJMXx0okMxElR6sfO1f8",
    authDomain: "gym4me-22882.firebaseapp.com",
    projectId: "gym4me-22882",
    storageBucket: "gym4me-22882.firebasestorage.app",
    messagingSenderId: "711205647702",
    appId: "1:711205647702:web:1b92b82656c75728e852f7",
    measurementId: "G-LEHHLDXCP6"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function promoteSiteAdmin() {
    const email = 'rladbxor@gmail.com';
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
