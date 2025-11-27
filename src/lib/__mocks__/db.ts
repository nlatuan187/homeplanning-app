import { PrismaClient } from '@prisma/client'
import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended'

// Create the mock directly
export const db = mockDeep<PrismaClient>()
export const prisma = db

// Helper for tests to access the mock with types
export const dbMock = db as unknown as DeepMockProxy<PrismaClient>

// Reset mock before each test
beforeEach(() => {
    mockReset(dbMock)
})
