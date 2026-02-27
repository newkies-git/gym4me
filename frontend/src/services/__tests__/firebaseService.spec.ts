import { beforeEach, describe, expect, it, vi } from 'vitest'

const getDocMock = vi.fn()
const getDocsMock = vi.fn()
const runTransactionMock = vi.fn()
const serverTimestampMock = vi.fn(() => 'ts')
const collectionMock = vi.fn((...args: any[]) => ({ path: args[1] || 'unknown' }))
const docMock = vi.fn((...args: any[]) => {
  if (args.length === 1 && args[0]?.path) return { path: `${args[0].path}/auto-id` }
  if (typeof args[1] === 'string' && typeof args[2] === 'string') return { path: `${args[1]}/${args[2]}` }
  if (typeof args[1] === 'string') return { path: args[1] }
  if (args[0]?.path && typeof args[1] === 'string') return { path: `${args[0].path}/${args[1]}` }
  return { path: 'unknown' }
})

vi.mock('../../firebase/config', () => ({
  db: {}
}))

vi.mock('firebase/firestore', () => ({
  collection: (...args: any[]) => collectionMock(...args),
  query: (...args: any[]) => ({ args }),
  where: (...args: any[]) => ({ where: args }),
  getDocs: (...args: any[]) => getDocsMock(...args),
  doc: (...args: any[]) => docMock(...args),
  updateDoc: vi.fn(),
  addDoc: vi.fn(),
  setDoc: vi.fn(),
  getDoc: (...args: any[]) => getDocMock(...args),
  deleteDoc: vi.fn(),
  serverTimestamp: () => serverTimestampMock(),
  runTransaction: (...args: any[]) => runTransactionMock(...args)
}))

describe('completeSession transaction', () => {
  beforeEach(() => {
    vi.resetModules()
    getDocMock.mockReset()
    getDocsMock.mockReset()
    runTransactionMock.mockReset()
  })

  it('deducts one session and writes ticket history for class trainees', async () => {
    const eventData = {
      id: 'event-1',
      title: 'PT Group',
      status: 'PENDING',
      type: 'PT',
      targetType: 'CLASS',
      classId: 'class-1',
      trainerEmail: 'trainer@test.com'
    }

    getDocMock.mockImplementation(async (ref: any) => {
      if (ref.path === 'schedules/event-1') return { exists: () => true, data: () => eventData }
      if (ref.path === 'classes/class-1') return { exists: () => true, data: () => ({ traineeEmails: ['member@test.com'] }) }
      return { exists: () => false, data: () => ({}) }
    })

    getDocsMock.mockResolvedValue({
      docs: [{ id: 'user-1', data: () => ({ email: 'member@test.com' }) }]
    })

    const updates: any[] = []
    const sets: any[] = []
    runTransactionMock.mockImplementation(async (_db: any, cb: any) => {
      const tx = {
        get: async (ref: any) => {
          if (ref.path === 'schedules/event-1') return { exists: () => true, data: () => ({ status: 'PENDING' }) }
          if (ref.path === 'users/user-1') return { exists: () => true, data: () => ({ email: 'member@test.com', remainingSessions: 3 }), ref }
          return { exists: () => false, data: () => ({}) }
        },
        update: (ref: any, payload: any) => updates.push({ ref, payload }),
        set: (ref: any, payload: any) => sets.push({ ref, payload })
      }
      await cb(tx)
    })

    const { completeSession } = await import('../firebaseService')
    await completeSession('event-1', 'signed-data', { email: 'trainer@test.com', lvl: 10, role: 'TRAINER' })

    const eventUpdate = updates.find((u) => u.ref.path === 'schedules/event-1')
    const userUpdate = updates.find((u) => u.ref.path === 'users/user-1')
    expect(eventUpdate).toBeTruthy()
    expect(eventUpdate.payload.status).toBe('COMPLETED')
    expect(userUpdate.payload.remainingSessions).toBe(2)
    expect(sets[0].payload.action).toBe('DEDUCT')
    expect(sets[0].payload.remainingSessions).toBe(2)
  })
})

