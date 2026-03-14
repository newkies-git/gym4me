import { db } from '../firebase/config'
import {
    collection,
    query,
    where,
    getDocs,
    addDoc,
    doc,
    updateDoc,
    serverTimestamp
} from 'firebase/firestore'
import type { ToolUsage, ToolMediaItem, User } from '../types'

function normalizeTool(docId: string, data: Record<string, unknown>): ToolUsage {
    const media = data.media as ToolMediaItem[] | undefined
    const mediaUrl = data.mediaUrl as string | undefined
    const mediaType = (data.mediaType as 'VIDEO' | 'IMAGE') || 'IMAGE'
    const mediaList: ToolMediaItem[] = Array.isArray(media) && media.length > 0
        ? media
        : mediaUrl ? [{ url: mediaUrl, type: mediaType }] : []
    return {
        id: docId,
        title: (data.title as string) ?? '',
        description: (data.description as string) ?? '',
        mediaUrl,
        mediaType,
        media: mediaList,
        category: (data.category as string) ?? '',
        trainerEmail: (data.trainerEmail as string) ?? '',
        trainerNickname: data.trainerNickname as string | undefined,
        isPrivate: !!data.isPrivate,
        targetTraineeEmail: data.targetTraineeEmail as string | undefined,
        createdAt: data.createdAt
    } as ToolUsage
}

export const getTools = async (user: User): Promise<ToolUsage[]> => {
    // 1. Fetch all public tools (no orderBy to avoid composite index requirement)
    const qPublic = query(
        collection(db, 'toolUsage'),
        where('isPrivate', '==', false)
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
        ...pubSnap.docs.map(d => normalizeTool(d.id, d.data() as Record<string, unknown>)),
        ...privMeSnap.docs.map(d => normalizeTool(d.id, d.data() as Record<string, unknown>)),
        ...privByMeSnap.docs.map(d => normalizeTool(d.id, d.data() as Record<string, unknown>))
    ]

    // Deduplicate
    const deduped = Array.from(new Map(all.map(item => [item.id, item])).values())
    // Sort by createdAt descending (newest first)
    const toMs = (v: unknown): number => {
        if (v == null) return 0
        if (typeof (v as any).toMillis === 'function') return (v as any).toMillis()
        if (typeof v === 'number') return v
        return 0
    }
    deduped.sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt))
    return deduped
}

function buildToolPayload(toolData: Partial<ToolUsage> & { trainerEmail?: string }) {
    const mediaList = (toolData.media && toolData.media.length > 0)
        ? toolData.media
        : (toolData.mediaUrl ? [{ url: toolData.mediaUrl, type: (toolData.mediaType as 'VIDEO' | 'IMAGE') || 'IMAGE' }] : [])
    const payload: Record<string, unknown> = {
        title: toolData.title ?? '',
        description: toolData.description ?? '',
        category: toolData.category ?? '',
        media: mediaList,
        isPrivate: !!toolData.isPrivate,
        trainerEmail: toolData.trainerEmail ?? '',
        trainerNickname: toolData.trainerNickname ?? '',
        createdAt: serverTimestamp()
    }
    if (payload.isPrivate && toolData.targetTraineeEmail) {
        payload.targetTraineeEmail = toolData.targetTraineeEmail
    }
    return payload
}

export const addTool = async (toolData: Partial<ToolUsage>) => {
    const payload = buildToolPayload(toolData)
    return await addDoc(collection(db, 'toolUsage'), payload)
}

export const updateTool = async (id: string, toolData: Partial<ToolUsage>) => {
    const payload = buildToolPayload(toolData)
    delete (payload as any).createdAt
    await updateDoc(doc(db, 'toolUsage', id), { ...payload, updatedAt: serverTimestamp() })
}
