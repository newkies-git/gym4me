import { db } from '../firebase/config'
import {
    collection,
    query,
    where,
    getDocs,
    doc,
    addDoc,
    serverTimestamp,
    orderBy,
    type DocumentData
} from 'firebase/firestore'
import type { ToolUsage, User } from '../types'

export const getTools = async (user: User): Promise<ToolUsage[]> => {
    // 1. Fetch all public tools
    const qPublic = query(
        collection(db, 'toolUsage'),
        where('isPrivate', '==', false),
        orderBy('createdAt', 'desc')
    )

    // 2. Fetch private tools for this user (if trainee)
    const qPrivateForMe = query(
        collection(db, 'toolUsage'),
        where('isPrivate', '==', true),
        where('targetTraineeEmail', '==', user.email)
    )

    // 3. Fetch private tools created by this user (if trainer)
    const qPrivateByMe = query(
        collection(db, 'toolUsage'),
        where('isPrivate', '==', true),
        where('trainerEmail', '==', user.email)
    )

    const [pubSnap, privMeSnap, privByMeSnap] = await Promise.all([
        getDocs(qPublic),
        getDocs(qPrivateForMe),
        getDocs(qPrivateByMe)
    ])

    const all = [
        ...pubSnap.docs.map(d => ({ id: d.id, ...d.data() } as ToolUsage)),
        ...privMeSnap.docs.map(d => ({ id: d.id, ...d.data() } as ToolUsage)),
        ...privByMeSnap.docs.map(d => ({ id: d.id, ...d.data() } as ToolUsage))
    ]

    // Deduplicate
    return Array.from(new Map(all.map(item => [item.id, item])).values())
}

export const addTool = async (toolData: Partial<ToolUsage>) => {
    return await addDoc(collection(db, 'toolUsage'), {
        ...toolData,
        createdAt: serverTimestamp()
    })
}
