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
    deleteDoc,
    serverTimestamp,
    runTransaction,
    type DocumentData,
    type QuerySnapshot,
    type QueryDocumentSnapshot,
    type Transaction
} from 'firebase/firestore'
import type { CalendarEvent, ExerciseRecord, ClientInfo, BodyRecord, TrainerProfile, ProfileHistory, Gym, GymClass, User } from '../types'

type AccessActor = Pick<User, 'email' | 'lvl' | 'role'>
export type ManagerType = 'PRIMARY' | 'VICE'
type AppUser = Record<string, any> & { uid: string }
type AuditPayload = {
    actorEmail: string
    action: string
    targetUid?: string
    targetEmail?: string
    metadata?: Record<string, any>
}

const chunkByTen = <T>(items: T[]): T[][] => {
    const chunks: T[][] = []
    for (let i = 0; i < items.length; i += 10) {
        chunks.push(items.slice(i, i + 10))
    }
    return chunks
}

const mapUsers = (snapshot: QuerySnapshot<DocumentData>): AppUser[] =>
    snapshot.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({ uid: d.id, ...d.data() }))
const isTrainerLevel = (user: Record<string, any>) => user.role === 'TRAINER' || user.role === 'MANAGER' || (user.lvl || 0) >= 10
const isActivePrimaryManager = (user: Record<string, any>) => user.role === 'MANAGER' && user.managerType === 'PRIMARY' && user.deletedFlag !== true

const demotePrimaryManagersToViceInGym = async (
    transaction: Transaction,
    gymId: string,
    exceptUid?: string
) => {
    const sameGymSnap = await getDocs(query(collection(db, 'users'), where('gymId', '==', gymId)))
    mapUsers(sameGymSnap).forEach((user) => {
        if (user.uid === exceptUid) return
        if (!isActivePrimaryManager(user)) return
        transaction.update(doc(db, 'users', user.uid), {
            managerType: 'VICE',
            updatedAt: serverTimestamp()
        })
    })
}

const isSiteAdminActor = (actor: AccessActor) => (actor.lvl || 0) >= 100 || actor.role === 'SITE_ADMIN'

const writeAuditLog = async (payload: AuditPayload) => {
    if (!payload.actorEmail) return
    await addDoc(collection(db, 'adminAuditLogs'), {
        actorEmail: payload.actorEmail,
        action: payload.action,
        targetUid: payload.targetUid || null,
        targetEmail: payload.targetEmail || null,
        metadata: payload.metadata || {},
        createdAt: serverTimestamp()
    })
}

const assertCanAccessUserData = async (targetEmail: string, actor: AccessActor) => {
    if (actor.email === targetEmail || isSiteAdminActor(actor)) return

    const isTrainer = (actor.lvl || 0) >= 10
    if (!isTrainer) throw new Error('Forbidden')

    const q = query(collection(db, 'users'), where('email', '==', targetEmail))
    const snap = await getDocs(q)
    if (snap.empty) throw new Error('Target user not found')

    const targetUser = snap.docs[0].data()
    if (targetUser.trainerEmail !== actor.email) {
        throw new Error('Forbidden')
    }
}

const assertCanAccessClassData = async (classId: string, actor: AccessActor) => {
    if (isSiteAdminActor(actor)) return

    const classSnap = await getDoc(doc(db, 'classes', classId))
    if (!classSnap.exists()) throw new Error('Class not found')

    const classData = classSnap.data()
    const traineeEmails: string[] = classData.traineeEmails || []
    const isOwnerTrainer = classData.trainerEmail === actor.email
    const isMember = traineeEmails.includes(actor.email)

    if (!isOwnerTrainer && !isMember) {
        throw new Error('Forbidden')
    }
}

// Schedules
export const getSchedules = async (targetEmail: string, actor: AccessActor): Promise<CalendarEvent[]> => {
    await assertCanAccessUserData(targetEmail, actor)

    // 1. 개인 일정 (Individual)
    const qIndividual = query(
        collection(db, 'schedules'),
        where('clientEmail', '==', targetEmail),
        where('targetType', '==', 'INDIVIDUAL')
    )

    // 2. 개인이 작성한 메모성 일정 (Personal)
    const qPersonal = query(
        collection(db, 'schedules'),
        where('userEmail', '==', targetEmail),
        where('targetType', '==', 'INDIVIDUAL')
    )

    // 3. 클래스 일정 (Class) - 소속된 클래스 목록을 먼저 조회해야 함
    const qClasses = query(
        collection(db, 'classes'),
        where('traineeEmails', 'array-contains', targetEmail)
    )
    const classSnap = await getDocs(qClasses)
    const classIds = classSnap.docs.map(d => d.id)

    const classSchedules: CalendarEvent[] = []
    if (classIds.length > 0) {
        // Firestore 'in' limitation: 10
        const classIdChunks = chunkByTen(classIds)
        for (const classIdChunk of classIdChunks) {
            const qClassSchedules = query(
                collection(db, 'schedules'),
                where('classId', 'in', classIdChunk)
            )
            const classSchedSnap = await getDocs(qClassSchedules)
            classSchedules.push(...classSchedSnap.docs.map(docSnap => mapSnapshotToEvent(docSnap)))
        }
    }

    const [indivSnap, persSnap] = await Promise.all([getDocs(qIndividual), getDocs(qPersonal)])

    const individualSchedules = indivSnap.docs.map(docSnap => mapSnapshotToEvent(docSnap))
    const personalSchedules = persSnap.docs.map(docSnap => mapSnapshotToEvent(docSnap))

    // Merge and deduplicate by ID
    const all = [...individualSchedules, ...personalSchedules, ...classSchedules]
    const unique = Array.from(new Map(all.map(item => [item.id, item])).values())

    return unique
}

export const getSchedulesByClass = async (classId: string, actor: AccessActor): Promise<CalendarEvent[]> => {
    await assertCanAccessClassData(classId, actor)

    const q = query(
        collection(db, 'schedules'),
        where('classId', '==', classId)
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map(docSnap => mapSnapshotToEvent(docSnap))
}

const mapSnapshotToEvent = (docSnap: any): CalendarEvent => {
    const data = docSnap.data()
    return {
        id: docSnap.id,
        title: data.title,
        dateStr: data.date,
        time: data.time,
        type: data.type,
        targetType: data.targetType || 'INDIVIDUAL',
        status: data.status,
        clientEmail: data.clientEmail,
        classId: data.classId,
        trainerEmail: data.trainerEmail,
        notes: data.notes,
        mediaUrl: data.mediaUrl,
        signatureUrl: data.signatureUrl,
        completedAt: data.completedAt,
        records: data.records || []
    }
}

export const addSchedule = async (scheduleData: Partial<CalendarEvent>) => {
    return await addDoc(collection(db, 'schedules'), {
        ...scheduleData,
        createdAt: serverTimestamp()
    })
}

export const updateSchedule = async (id: string, updates: any) => {
    return await updateDoc(doc(db, 'schedules', id), updates)
}

// Classes
export const createClass = async (classData: Omit<GymClass, 'id'>) => {
    const data: any = { ...classData }
    if (data.gymId === undefined) delete data.gymId
    return await addDoc(collection(db, 'classes'), {
        ...data,
        createdAt: serverTimestamp()
    })
}

export const getClassesByTrainer = async (trainerEmail: string): Promise<GymClass[]> => {
    const q = query(collection(db, 'classes'), where('trainerEmail', '==', trainerEmail))
    const snap = await getDocs(q)
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as GymClass))
}

export const addTraineeToClass = async (classId: string, traineeEmail: string) => {
    const classRef = doc(db, 'classes', classId)
    const classSnap = await getDoc(classRef)
    if (!classSnap.exists()) throw new Error("Class not found")

    const traineeEmails = classSnap.data().traineeEmails || []
    if (traineeEmails.includes(traineeEmail)) return

    return await updateDoc(classRef, {
        traineeEmails: [...traineeEmails, traineeEmail]
    })
}

export const removeTraineeFromClass = async (classId: string, traineeEmail: string) => {
    const classRef = doc(db, 'classes', classId)
    const classSnap = await getDoc(classRef)
    if (!classSnap.exists()) throw new Error('Class not found')

    const traineeEmails = classSnap.data().traineeEmails || []
    if (!traineeEmails.includes(traineeEmail)) return

    return await updateDoc(classRef, {
        traineeEmails: traineeEmails.filter((email: string) => email !== traineeEmail)
    })
}

// Clients (Existing)
export const getClientsByTrainer = async (trainerEmail: string): Promise<ClientInfo[]> => {
    // ... (logic remains similar but we can also fetch from classes if needed)
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
export const getTrainers = async (gymId?: string, includeDeleted = false): Promise<any[]> => {
    // Avoid composite-index requirement by querying a single field and filtering locally.
    const q = gymId
        ? query(collection(db, 'users'), where('gymId', '==', gymId))
        : query(collection(db, 'users'), where('role', '==', 'TRAINER'))

    const snapshot = await getDocs(q)
    const loaded = mapUsers(snapshot).filter((u: any) => (u.role === 'TRAINER') || (u.lvl || 0) >= 10)
    if (includeDeleted) return loaded
    return loaded.filter((u: any) => u.deletedFlag !== true)
}

export const updateTrainerRole = async (uid: string, role: string, lvl: number, gymId?: string, audit?: AuditPayload) => {
    const updates: any = { role, lvl }
    if (gymId) updates.gymId = gymId
    await updateDoc(doc(db, 'users', uid), updates)
    if (audit) await writeAuditLog(audit)
}

export const updateTrainerInfo = async (uid: string, updates: { nickname?: string; gymId?: string }) => {
    return await updateDoc(doc(db, 'users', uid), updates)
}

export const setTrainerDeletedFlag = async (uid: string, deleted: boolean) => {
    return await updateDoc(doc(db, 'users', uid), {
        deletedFlag: deleted,
        deletedAt: deleted ? serverTimestamp() : null
    })
}

export const setTrainerDeletedFlagWithAudit = async (uid: string, deleted: boolean, audit: AuditPayload) => {
    await setTrainerDeletedFlag(uid, deleted)
    await writeAuditLog(audit)
}

export const deleteTrainerCompletely = async (uid: string) => {
    return await deleteDoc(doc(db, 'users', uid))
}

export const deleteTrainerCompletelyWithAudit = async (uid: string, audit: AuditPayload) => {
    await deleteTrainerCompletely(uid)
    await writeAuditLog(audit)
}

// Manager Management (Site Admin Actions)
export const getManagers = async (gymId?: string, includeDeleted = false): Promise<any[]> => {
    const q = gymId
        ? query(collection(db, 'users'), where('gymId', '==', gymId))
        : query(collection(db, 'users'), where('role', '==', 'MANAGER'))

    const snapshot = await getDocs(q)
    const loaded = mapUsers(snapshot).filter((u: any) => u.role === 'MANAGER')

    const gymFiltered = gymId ? loaded.filter((u: any) => u.gymId === gymId) : loaded
    if (includeDeleted) return gymFiltered
    return gymFiltered.filter((u: any) => u.deletedFlag !== true)
}

export const getManagerCandidates = async (gymId: string): Promise<any[]> => {
    const q = query(collection(db, 'users'), where('gymId', '==', gymId))
    const snapshot = await getDocs(q)
    return mapUsers(snapshot).filter((u: any) => isTrainerLevel(u) && u.deletedFlag !== true)
}

export const assignManagerFromTrainer = async (uid: string, gymId: string, managerType: ManagerType) => {
    const targetRef = doc(db, 'users', uid)
    await runTransaction(db, async (transaction) => {
        const targetSnap = await transaction.get(targetRef)
        if (!targetSnap.exists()) throw new Error('Trainer not found')

        const target = targetSnap.data() as any
        const isTrainerOrHigher = isTrainerLevel(target)
        if (!isTrainerOrHigher) throw new Error('Target user is not trainer-level')
        if (target.deletedFlag === true) throw new Error('Deleted user cannot be assigned')

        if (managerType === 'PRIMARY') {
            await demotePrimaryManagersToViceInGym(transaction, gymId, uid)
        }

        transaction.update(targetRef, {
            role: 'MANAGER',
            lvl: 20,
            gymId,
            managerType,
            deletedFlag: false,
            deletedAt: null,
            updatedAt: serverTimestamp()
        })
    })
}

export const assignManagerFromTrainerWithAudit = async (uid: string, gymId: string, managerType: ManagerType, audit: AuditPayload) => {
    await assignManagerFromTrainer(uid, gymId, managerType)
    await writeAuditLog(audit)
}

export const updateManagerInfo = async (uid: string, updates: { nickname?: string; gymId?: string; managerType?: ManagerType }) => {
    const managerRef = doc(db, 'users', uid)
    await runTransaction(db, async (transaction) => {
        const managerSnap = await transaction.get(managerRef)
        if (!managerSnap.exists()) throw new Error('Manager not found')
        const manager = managerSnap.data() as any
        if (manager.role !== 'MANAGER') throw new Error('Target user is not manager')

        const nextGymId = updates.gymId ?? manager.gymId
        const nextManagerType = updates.managerType ?? manager.managerType ?? 'VICE'
        if (!nextGymId) throw new Error('Gym is required')

        if (nextManagerType === 'PRIMARY') {
            await demotePrimaryManagersToViceInGym(transaction, nextGymId, uid)
        }

        const payload: any = {
            managerType: nextManagerType,
            gymId: nextGymId,
            updatedAt: serverTimestamp()
        }
        if (updates.nickname !== undefined) payload.nickname = updates.nickname

        transaction.update(managerRef, payload)
    })
}

export const updateManagerInfoWithAudit = async (
    uid: string,
    updates: { nickname?: string; gymId?: string; managerType?: ManagerType },
    audit: AuditPayload
) => {
    await updateManagerInfo(uid, updates)
    await writeAuditLog(audit)
}

export const setManagerDeletedFlag = async (uid: string, deleted: boolean) => {
    return await updateDoc(doc(db, 'users', uid), {
        deletedFlag: deleted,
        deletedAt: deleted ? serverTimestamp() : null,
        updatedAt: serverTimestamp()
    })
}

export const setManagerDeletedFlagWithAudit = async (uid: string, deleted: boolean, audit: AuditPayload) => {
    await setManagerDeletedFlag(uid, deleted)
    await writeAuditLog(audit)
}

export const deleteManagerCompletely = async (uid: string) => {
    return await deleteDoc(doc(db, 'users', uid))
}

export const deleteManagerCompletelyWithAudit = async (uid: string, audit: AuditPayload) => {
    await deleteManagerCompletely(uid)
    await writeAuditLog(audit)
}

export const demoteManagerToTrainer = async (uid: string) => {
    return await updateDoc(doc(db, 'users', uid), {
        role: 'TRAINER',
        lvl: 10,
        managerType: null,
        updatedAt: serverTimestamp()
    })
}

export const demoteManagerToTrainerWithAudit = async (uid: string, audit: AuditPayload) => {
    await demoteManagerToTrainer(uid)
    await writeAuditLog(audit)
}

export const appendClassWorkoutLog = async (event: CalendarEvent, records: ExerciseRecord[]) => {
    if (!event.classId) throw new Error('Class event is required')

    const classSnap = await getDoc(doc(db, 'classes', event.classId))
    if (!classSnap.exists()) throw new Error('Class not found')

    const traineeEmails: string[] = classSnap.data().traineeEmails || []
    if (traineeEmails.length === 0) return

    const jobs = traineeEmails.map((email) =>
        addDoc(collection(db, 'workoutLogs'), {
            userEmail: email,
            classId: event.classId,
            scheduleId: event.id,
            title: event.title,
            date: event.dateStr,
            records,
            source: 'CLASS_BULK',
            createdAt: serverTimestamp()
        })
    )
    await Promise.all(jobs)
}

export const completeSession = async (eventId: string, signatureUrl: string, actor: AccessActor) => {
    const eventRef = doc(db, 'schedules', eventId)
    const eventSnap = await getDoc(eventRef)
    if (!eventSnap.exists()) throw new Error("Event not found")
    const eventData = eventSnap.data() as CalendarEvent
    if (!isSiteAdminActor(actor) && actor.email !== eventData.trainerEmail) {
        throw new Error('Forbidden')
    }

    // Determine target emails for deduction
    const emailsToDeduct: string[] = []
    if (eventData.type === 'PT') {
        if (eventData.targetType === 'CLASS' && eventData.classId) {
            const classSnap = await getDoc(doc(db, 'classes', eventData.classId))
            if (classSnap.exists()) {
                emailsToDeduct.push(...(classSnap.data().traineeEmails || []))
            }
        } else if (eventData.clientEmail) {
            emailsToDeduct.push(eventData.clientEmail)
        }
    }

    // Resolve UIDs for those emails (outside transaction)
    const uidsToDeduct: string[] = []
    if (emailsToDeduct.length > 0) {
        const emailChunks = chunkByTen(emailsToDeduct)
        for (const emailChunk of emailChunks) {
            const usersQ = query(collection(db, 'users'), where('email', 'in', emailChunk))
            const usersSnap = await getDocs(usersQ)
            usersSnap.docs.forEach(d => {
                uidsToDeduct.push(d.id)
            })
        }
    }

    await runTransaction(db, async (transaction) => {
        const currentEventSnap = await transaction.get(eventRef)
        if (!currentEventSnap.exists()) throw new Error("Event not found")
        if (currentEventSnap.data().status === 'COMPLETED') throw new Error("Already completed")

        // 1. All Reads First
        const userSnaps = []
        for (const uid of uidsToDeduct) {
            userSnaps.push(await transaction.get(doc(db, 'users', uid)))
        }

        // 2. All Writes Second
        // Update Event
        transaction.update(eventRef, {
            status: 'COMPLETED',
            signatureUrl,
            completedAt: serverTimestamp()
        })

        // Deduct credits for all resolved users
        for (const userSnap of userSnaps) {
            if (userSnap.exists()) {
                const userData = userSnap.data()
                const currentSessions = userData.remainingSessions || 0
                if (currentSessions > 0) {
                    transaction.update(userSnap.ref, {
                        remainingSessions: currentSessions - 1
                    })

                    // Log history
                    const historyRef = doc(collection(db, 'ticketHistory'))
                    transaction.set(historyRef, {
                        clientEmail: userData.email,
                        trainerEmail: eventData.trainerEmail,
                        action: 'DEDUCT',
                        amountChanged: -1,
                        remainingSessions: currentSessions - 1,
                        reason: `PT Session Completed: ${eventData.title}`,
                        createdAt: serverTimestamp()
                    })
                }
            }
        }
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
    return logs.sort((a: any, b: any) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0))
}

// Body Profiles
export const getBodyProfiles = async (targetEmail: string, actor: AccessActor): Promise<BodyRecord[]> => {
    await assertCanAccessUserData(targetEmail, actor)

    const q = query(collection(db, 'bodyProfiles'), where('userEmail', '==', targetEmail))
    const snapshot = await getDocs(q)
    const loaded = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<BodyRecord, 'id'>)
    }))
    loaded.sort((a, b) => a.date.localeCompare(b.date))
    return loaded
}

export const addBodyProfile = async (targetEmail: string, data: Partial<BodyRecord>, actor: AccessActor) => {
    await assertCanAccessUserData(targetEmail, actor)

    return await addDoc(collection(db, 'bodyProfiles'), {
        userEmail: targetEmail,
        date: data.date,
        weight: data.weight,
        bodyFat: data.bodyFat || null,
        muscleMass: data.muscleMass || null,
        createdAt: serverTimestamp()
    })
}
