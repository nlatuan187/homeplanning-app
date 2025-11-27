import { createPlanFromOnboarding } from '@/actions/createPlanFromOnboarding'
import { db } from '@/lib/db'
import { DeepMockProxy, mockReset } from 'jest-mock-extended'
import { PrismaClient } from '@prisma/client'
import { currentUser } from '@clerk/nextjs/server'
import { calculateOnboardingProjection } from '@/actions/calculateOnboardingProjection'
import { getNextOnboardingStep } from '@/actions/onboardingActions'

// Mock dependencies
jest.mock('@clerk/nextjs/server', () => ({
    currentUser: jest.fn(),
}))

jest.mock('@/lib/db')

jest.mock('@/actions/calculateOnboardingProjection', () => ({
    calculateOnboardingProjection: jest.fn(),
}))

jest.mock('@/actions/onboardingActions', () => ({
    getNextOnboardingStep: jest.fn(),
}))

jest.mock('@/lib/logger', () => ({
    __esModule: true,
    default: {
        info: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
    },
}))

describe('createPlanFromOnboarding', () => {
    const mockCurrentUser = currentUser as jest.Mock
    const mockCalculateProjection = calculateOnboardingProjection as jest.Mock
    const mockGetNextStep = getNextOnboardingStep as jest.Mock
    const dbMock = db as unknown as DeepMockProxy<PrismaClient>

    beforeEach(() => {
        mockReset(dbMock)
    })

    it('sanity check: db mock should work', async () => {
        dbMock.user.findUnique.mockResolvedValue(null)
        const user = await db.user.findUnique({ where: { id: 'test' } })
        expect(user).toBeNull()
    })

    it('should return unauthorized if no user', async () => {
        mockCurrentUser.mockResolvedValue(null)
        const result = await createPlanFromOnboarding({})
        expect(result.success).toBe(false)
        expect(result.error).toBe('Unauthorized')
    })

    it('should return error for invalid input', async () => {
        mockCurrentUser.mockResolvedValue({ id: 'user_123', emailAddresses: [] })
        const result = await createPlanFromOnboarding({})
        expect(result.success).toBe(false)
        expect(result.error).toContain('Invalid onboarding data')
    })

    it('should create new plan for new user', async () => {
        mockCurrentUser.mockResolvedValue({
            id: 'user_123',
            emailAddresses: [{ emailAddress: 'test@example.com' }]
        })

        // Mock DB: User not found, then create user
        dbMock.user.findUnique.mockResolvedValue(null)
        dbMock.user.create.mockResolvedValue({ id: 'user_123', email: 'test@example.com' } as any)

        // Mock DB: No existing plan
        dbMock.plan.findFirst.mockResolvedValue(null)

        // Mock Projection
        mockCalculateProjection.mockResolvedValue({
            success: true,
            isAffordable: true,
            earliestAffordableYear: 2028,
        })

        // Mock Transaction
        dbMock.$transaction.mockImplementation(async (callback: any) => {
            return callback(dbMock)
        })

        // Mock Plan Creation
        dbMock.plan.create.mockResolvedValue({ id: 'plan_123' } as any)

        const input = {
            yearsToPurchase: 2030,
            targetHousePriceN0: 5,
            monthlyLivingExpenses: 10,
            targetHouseType: 'Chung cư',
            targetLocation: 'Hà Nội',
        } as any

        const result = await createPlanFromOnboarding(input)

        expect(result.success).toBe(true)
        expect(result.planId).toBe('plan_123')

        // Verify user creation logic
        expect(dbMock.user.create).toHaveBeenCalled()

        // Verify plan creation
        expect(dbMock.plan.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                yearsToPurchase: expect.any(Number),
                targetHousePriceN0: 5000, // Converted
            })
        }))
    })

    it('should update existing plan', async () => {
        mockCurrentUser.mockResolvedValue({
            id: 'user_123',
            emailAddresses: [{ emailAddress: 'test@example.com' }]
        })

        // Mock DB: User exists
        dbMock.user.findUnique.mockResolvedValue({ id: 'user_123', email: 'test@example.com' } as any)

        // Mock DB: Existing plan
        dbMock.plan.findFirst.mockResolvedValue({ id: 'plan_existing', userId: 'user_123' } as any)

        // Mock onboardingProgress.findUnique (for data preservation check)
        dbMock.onboardingProgress.findUnique.mockResolvedValue({
            planId: 'plan_existing',
            quickCheckState: 'COMPLETED',
            familySupportState: 'NOT_STARTED',
            spendingState: 'NOT_STARTED',
            assumptionState: 'NOT_STARTED',
        } as any)

        // Mock Projection
        mockCalculateProjection.mockResolvedValue({
            success: true,
            isAffordable: true,
            earliestAffordableYear: 2028,
        })

        // Mock $transaction for plan update + report upsert
        dbMock.$transaction.mockImplementation(async (callback: any) => {
            return await callback(dbMock)
        })

        // Mock Next Step
        mockGetNextStep.mockResolvedValue('/next-step')

        const input = {
            yearsToPurchase: 2030,
            targetHousePriceN0: 5,
            monthlyLivingExpenses: 10,
            targetHouseType: 'Chung cư',
            targetLocation: 'Hà Nội',
        } as any

        const result = await createPlanFromOnboarding(input)

        expect(result.success).toBe(true)
        expect(result.planId).toBe('plan_existing')
        expect(result.existed).toBe(true)
        expect(result.nextStepUrl).toBe('/next-step')

        // Verify update (now inside transaction)
        expect(dbMock.plan.update).toHaveBeenCalledWith(expect.objectContaining({
            where: { id: 'plan_existing' },
            data: expect.objectContaining({
                targetHousePriceN0: 5000,
            })
        }))

        // Verify projectionCache was updated
        expect(dbMock.planReport.upsert).toHaveBeenCalled()
    })
})
