import { db } from '../firebase/config'
import {
    collection,
    query,
    where,
    getDocs,
    doc,
    updateDoc,
    addDoc,
    setDoc,
    getDoc,
    serverTimestamp,
    orderBy,
    runTransaction,
    type DocumentData
} from 'firebase/firestore'
import type { CalendarEvent, ExerciseRecord, ClientInfo, BodyRecord, TrainerProfile, ProfileHistory, Gym } from '../types'

// Schedules
export const getSchedules = async (targetEmail: string): Promise<CalendarEvent[]> => {
    const q = query(
        collection(db, 'schedules'),
        where('userEmail', '==', targetEmail)
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        title: docSnap.data().title,
        dateStr: docSnap.data().date,
        time: docSnap.data().time,
        type: docSnap.data().type as 'PT' | 'PERSONAL',
        status: docSnap.data().status as 'PENDING' | 'APPROVED' | 'COMPLETED' | 'CANCELLED',
        clientEmail: docSnap.data().clientEmail,
        notes: docSnap.data().notes,
        mediaUrl: docSnap.data().mediaUrl,
        records: docSnap.data().records || []
    }))
}

export const addSchedule = async (scheduleData: Partial<DocumentData>) => {
    return await addDoc(collection(db, 'schedules'), {
        ...scheduleData,
        createdAt: serverTimestamp()
    })
}

export const updateSchedule = async (id: string, updates: Partial<DocumentData>) => {
    return await updateDoc(doc(db, 'schedules', id), updates)
}

// Clients
export const getClientsByTrainer = async (trainerEmail: string): Promise<ClientInfo[]> => {
    const q = query(collection(db, 'users'), where('trainerEmail', '==', trainerEmail))
    const snapshot = await getDocs(q)
    return snapshot.docs.map(docSnap => ({
        uid: docSnap.id,
        email: docSnap.data().email,
        nickname: docSnap.data().nickname,
        remainingSessions: docSnap.data().remainingSessions,
        expirationDate: docSnap.data().expirationDate
    }))
}

export const assignTrainerToClient = async (clientId: string, trainerEmail: string) => {
    return await updateDoc(doc(db, 'users', clientId), { trainerEmail })
}

export const updateClientSession = async (clientId: string, updates: Pick<ClientInfo, "remainingSessions" | "expirationDate">) => {
    return await updateDoc(doc(db, 'users', clientId), updates)
}

export const logTicketHistory = async (historyData: Partial<DocumentData>) => {
    return await addDoc(collection(db, 'ticketHistory'), {
        ...historyData,
        createdAt: serverTimestamp()
    })
}

export const searchUserByEmail = async (email: string) => {
    const q = query(collection(db, 'users'), where('email', '==', email))
    const snapshot = await getDocs(q)
    return snapshot.empty ? null : { id: snapshot.docs[0].id, data: snapshot.docs[0].data() }
}

// Gym Management
export const getGyms = async (): Promise<Gym[]> => {
    const snapshot = await getDocs(collection(db, 'gyms'))
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Gym))
}

export const createGym = async (gymData: Partial<Gym>) => {
    const docRef = await addDoc(collection(db, 'gyms'), {
        ...gymData,
        createdAt: serverTimestamp()
    })
    // Also update the manager's profile to link to this gym and set role to MANAGER (lvl 20)
    if (gymData.managerEmail) {
        const q = query(collection(db, 'users'), where('email', '==', gymData.managerEmail))
        const snap = await getDocs(q)
        if (!snap.empty) {
            await updateDoc(doc(db, 'users', snap.docs[0].id), {
                gymId: docRef.id,
                role: 'MANAGER',
                lvl: 20
            })
        }
    }
    return docRef
}

export const updateGym = async (id: string, updates: Partial<Gym>) => {
    return await updateDoc(doc(db, 'gyms', id), updates)
}

// Trainer Management (Manager Actions)
export const getTrainers = async (gymId?: string): Promise<any[]> => {
    let q = query(collection(db, 'users'), where('lvl', '>=', 10))
    if (gymId) {
        q = query(collection(db, 'users'), where('lvl', '>=', 10), where('gymId', '==', gymId))
    }
    const snapshot = await getDocs(q)
    return snapshot.docs.map(d => ({ uid: d.id, ...d.data() }))
}

export const updateTrainerRole = async (uid: string, role: string, lvl: number, gymId?: string) => {
    const updates: any = { role, lvl }
    if (gymId) updates.gymId = gymId
    return await updateDoc(doc(db, 'users', uid), updates)
}

// Session Completion & Signatures
export const completeSession = async (eventId: string, signatureUrl: string) => {
    const eventRef = doc(db, 'schedules', eventId)

    await runTransaction(db, async (transaction) => {
        const eventSnap = await transaction.get(eventRef)
        if (!eventSnap.exists()) throw new Error("Event not found")

        const eventData = eventSnap.data()
        if (eventData.status === 'COMPLETED') throw new Error("Already completed")

        // Update Event
        transaction.update(eventRef, {
            status: 'COMPLETED',
            signatureUrl,
            completedAt: serverTimestamp()
        })

        // If PT, decrement sessions for the client
        if (eventData.type === 'PT' && eventData.clientEmail) {
            const userQuery = query(collection(db, 'users'), where('email', '==', eventData.clientEmail))
            const userSnap = await getDocs(userQuery)

            if (!userSnap.empty) {
                const userDoc = userSnap.docs[0]
                const currentSessions = userDoc.data().remainingSessions || 0
                if (currentSessions > 0) {
                    transaction.update(doc(db, 'users', userDoc.id), {
                        remainingSessions: currentSessions - 1
                    })

                    // Log ticket history
                    const historyRef = doc(collection(db, 'ticketHistory'))
                    transaction.set(historyRef, {
                        userEmail: eventData.clientEmail,
                        type: 'DEDUCTION',
                        amount: 1,
                        remainingSessions: currentSessions - 1,
                        reason: `PT Session Completed: ${eventData.title}`,
                        createdAt: serverTimestamp()
                    })
                }
            }
        }
    })
}

// Site Admin Actions
export const promoteToManager = async (email: string) => {
    const q = query(collection(db, 'users'), where('email', '==', email))
    const snap = await getDocs(q)
    if (snap.empty) throw new Error("User not found")
    return await updateDoc(doc(db, 'users', snap.docs[0].id), {
        role: 'MANAGER',
        lvl: 20
    })
}

// Trainer Profiles
export const getTrainerProfile = async (email: string): Promise<TrainerProfile | null> => {
    const docRef = doc(db, 'trainerProfiles', email)
    const snap = await getDoc(docRef)
    if (!snap.exists()) return null
    return { uid: snap.data().uid, email, ...snap.data() } as TrainerProfile
}

export const updateTrainerProfile = async (email: string, profile: Partial<TrainerProfile>, before: Partial<TrainerProfile> = {}) => {
    const docRef = doc(db, 'trainerProfiles', email)
    await setDoc(docRef, {
        ...profile,
        updatedAt: serverTimestamp()
    }, { merge: true })

    // Log history
    await addDoc(collection(db, 'profileHistory'), {
        trainerEmail: email,
        before,
        after: profile,
        updatedAt: serverTimestamp()
    })
}

export const getProfileHistory = async (email: string): Promise<ProfileHistory[]> => {
    const q = query(
        collection(db, 'profileHistory'),
        where('trainerEmail', '==', email)
    )
    const snapshot = await getDocs(q)
    const logs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ProfileHistory))
    // Manual sort because composite index might not exist yet
    return logs.sort((a: any, b: any) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0))
}

// Body Profiles
export const getBodyProfiles = async (targetEmail: string): Promise<BodyRecord[]> => {
    const q = query(collection(db, 'bodyProfiles'), where('userEmail', '==', targetEmail))
    const snapshot = await getDocs(q)
    const loaded = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<BodyRecord, 'id'>)
    }))
    // Sort ascending by date
    loaded.sort((a, b) => a.date.localeCompare(b.date))
    return loaded
}

export const addBodyProfile = async (targetEmail: string, data: Partial<BodyRecord>) => {
    return await addDoc(collection(db, 'bodyProfiles'), {
        userEmail: targetEmail,
        date: data.date,
        weight: data.weight,
        bodyFat: data.bodyFat || null,
        muscleMass: data.muscleMass || null,
        createdAt: serverTimestamp()
    })
}

