import { db } from '../firebase/config'
import {
    collection,
    query,
    where,
    getDocs,
    getDoc,
    addDoc,
    doc,
    updateDoc,
    orderBy,
    serverTimestamp,
    runTransaction
} from 'firebase/firestore'
import { increment } from 'firebase/firestore'
import type { ToolUsage, ToolMediaItem, ToolComment, User } from '../types'

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
        ,
        viewsCount: typeof data.viewsCount === 'number' ? data.viewsCount : 0,
        commentsCount: typeof data.commentsCount === 'number' ? data.commentsCount : 0
    } as ToolUsage
}

export async function incrementToolViews(toolId: string): Promise<void> {
    await updateDoc(doc(db, 'toolUsage', toolId), {
        viewsCount: increment(1)
    })
}

/**
 * Counts a view only once per viewer.
 * Stores a marker doc at: toolUsage/{toolId}/views/{viewerEmail}
 */
export async function incrementToolViewsOnce(toolId: string, viewerEmail: string): Promise<void> {
    if (!toolId || !viewerEmail) return

    const viewDocRef = doc(db, 'toolUsage', toolId, 'views', viewerEmail)
    const toolDocRef = doc(db, 'toolUsage', toolId)

    await runTransaction(db, async (tx) => {
        const viewSnap = await tx.get(viewDocRef)
        if (viewSnap.exists()) return

        const toolSnap = await tx.get(toolDocRef)

        tx.set(viewDocRef, { createdAt: serverTimestamp() })
        if (toolSnap.exists()) {
            tx.update(toolDocRef, { viewsCount: increment(1) })
        } else {
            tx.set(toolDocRef, { viewsCount: 1 }, { merge: true })
        }
    })
}

export async function getToolComments(toolId: string): Promise<ToolComment[]> {
    const q = query(
        collection(db, 'toolUsage', toolId, 'comments'),
        orderBy('createdAt', 'desc')
    )
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ToolComment, 'id'>) }))
}

export async function addToolComment(toolId: string, payload: { content: string; authorEmail: string; authorNickname?: string }): Promise<void> {
    const commentRef = await addDoc(collection(db, 'toolUsage', toolId, 'comments'), {
        content: payload.content,
        authorEmail: payload.authorEmail,
        authorNickname: payload.authorNickname ?? null,
        createdAt: serverTimestamp()
    })

    // increment count (best-effort)
    await updateDoc(doc(db, 'toolUsage', toolId), {
        commentsCount: increment(1)
    })

    void commentRef
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

/**
 * Patch only media durations for an existing tool doc.
 * - durationsByUrl: { [mediaUrl]: durationSec }
 */
export const patchToolMediaDurations = async (id: string, durationsByUrl: Record<string, number>) => {
    const snap = await getDoc(doc(db, 'toolUsage', id))
    if (!snap.exists()) return

    const data = snap.data() as Record<string, unknown>

    const existingMedia = Array.isArray(data.media) ? (data.media as ToolMediaItem[]) : undefined
    const mediaUrl = data.mediaUrl as string | undefined
    const mediaType = (data.mediaType as 'VIDEO' | 'IMAGE' | undefined) || 'IMAGE'

    const mediaList: ToolMediaItem[] =
        existingMedia && existingMedia.length > 0
            ? existingMedia.map((m) => ({ ...m }))
            : mediaUrl
              ? [{ url: mediaUrl, type: mediaType }]
              : []

    if (!mediaList.length) return

    const updated = mediaList.map((m) => {
        const nextDur = durationsByUrl[m.url]
        if (nextDur == null) return m
        return { ...m, durationSec: Math.floor(nextDur) }
    })

    await updateDoc(doc(db, 'toolUsage', id), {
        media: updated,
        updatedAt: serverTimestamp()
    })
}
