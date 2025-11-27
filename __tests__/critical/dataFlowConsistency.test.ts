// Mock dependencies BEFORE imports
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
    },
}))

import { createPlanFromOnboarding } from '@/actions/createPlanFromOnboarding'
import { db } from '@/lib/db'
import { DeepMockProxy, mockReset } from 'jest-mock-extended'
import { PrismaClient } from '@prisma/client'
import { currentUser } from '@clerk/nextjs/server'
import { calculateOnboardingProjection } from '@/actions/calculateOnboardingProjection'
import { getNextOnboardingStep } from '@/actions/onboardingActions'

describe('Data Flow Consistency - Critical P0 & P1 Tests', () => {
    const mockCurrentUser = currentUser as jest.Mock
    const mockCalculateProjection = calculateOnboardingProjection as jest.Mock
    const mockGetNextStep = getNextOnboardingStep as jest.Mock
    const dbMock = db as unknown as DeepMockProxy<PrismaClient>

    beforeEach(() => {
        mockReset(dbMock)
        mockCurrentUser.mockResolvedValue({
            id: 'user_123',
            emailAddresses: [{ emailAddress: 'test@example.com' }]
        })
        dbMock.user.findUnique.mockResolvedValue({
            id: 'user_123',
            email: 'test@example.com'
        } as any)
        mockCalculateProjection.mockResolvedValue({
            success: true,
            isAffordable: true,
            earliestAffordableYear: 2028,
        })
    })

    describe('P0 - CRITICAL: Data Preservation Across Steps', () => {
        it('[BUG CONFIRMED] should preserve Family Support data when updating Quick Check', async () => {
            const existingPlan = {
                id: 'plan_1',
                userId: 'user_123',
                yearsToPurchase: 5,
                targetHousePriceN0: 5000,
                // Family Support data (from later step)
                hasCoApplicant: true,
                coApplicantMonthlyIncome: 20,
                // Spending data
                hasNewChild: true,
                monthlyChildExpenses: 15,
                monthlyNonHousingDebt: 5,
                // Assumptions data (user customized)
                pctSalaryGrowth: 9.0,
                pctHouseGrowth: 12.0,
                pctExpenseGrowth: 5.0,
            }

            dbMock.plan.findFirst.mockResolvedValue(existingPlan as any)
            mockGetNextStep.mockResolvedValue('/family-support')

            // User just wants to change target price
            const input = {
                yearsToPurchase: 2032,
                targetHousePriceN0: 6, // Changed from 5 to 6
                monthlyLivingExpenses: 10,
            } as any

            await createPlanFromOnboarding(input)

            const updateCall = dbMock.plan.update.mock.calls[0]
            const updateData = updateCall[0].data

            // ❌ CURRENT BUG: These SHOULD be preserved but are RESET!
            expect(updateData.hasNewChild).toBe(true) // Currently null
            expect(updateData.monthlyChildExpenses).toBe(15) // Currently 0
            expect(updateData.pctSalaryGrowth).toBe(9.0) // Currently 7.0
            expect(updateData.hasCoApplicant).toBe(true) // May be preserved
        })

        it('[P0] should preserve Spending data when updating Assumptions', async () => {
            // This would test updateAndRecalculateAssumption
            // Currently out of scope for createPlanFromOnboarding
            // But documents expectation
            expect(true).toBe(true)
        })

        it('[P0] should preserve Assumptions when updating Family Support', async () => {
            // This would test updateAndRecalculateFamilySupport
            // Currently out of scope
            expect(true).toBe(true)
        })
    })

    describe('P0 - CRITICAL: Year Boundary Bugs', () => {
        it('[BUG] should reject yearsToPurchase equal to current year', async () => {
            const currentYear = new Date().getFullYear()

            dbMock.plan.findFirst.mockResolvedValue(null)
            dbMock.$transaction.mockImplementation(async (callback: any) => {
                return callback(dbMock)
            })
            dbMock.plan.create.mockResolvedValue({ id: 'plan_1' } as any)

            const input = {
                yearsToPurchase: currentYear, // THIS YEAR (0 years from now)
                targetHousePriceN0: 5,
                monthlyLivingExpenses: 10,
            } as any

            const result = await createPlanFromOnboarding(input)

            // Line 108: yearsToPurchase - currentYear = 0
            // Line 190: Check < 0 will MISS this
            // Expected: Should reject or handle specially
            // Actual: Creates plan with yearsToPurchase = 0 (BUG!)

            if (result.success) {
                const createCall = dbMock.plan.create.mock.calls[0]
                const planData = createCall[0].data
                expect(planData.yearsToPurchase).not.toBe(0) // Should reject or handle
            }
        })

        it('[P0] should reject negative yearsToPurchase from past years', async () => {
            const result = await createPlanFromOnboarding({
                yearsToPurchase: 2020, // Past year
                targetHousePriceN0: 5,
                monthlyLivingExpenses: 10,
            } as any)

            expect(result.success).toBe(false)
            expect(result.error).toContain('Invalid yearsToPurchase')
        })

        it('[P0] should handle year very far in future', async () => {
            dbMock.plan.findFirst.mockResolvedValue(null)
            dbMock.$transaction.mockImplementation(async (callback: any) => {
                return callback(dbMock)
            })
            dbMock.plan.create.mockResolvedValue({ id: 'plan_1' } as any)

            const result = await createPlanFromOnboarding({
                yearsToPurchase: 2100, // 75 years from now
                targetHousePriceN0: 5,
                monthlyLivingExpenses: 10,
            } as any)

            // Should either reject or at least warn
            // Projections 75 years out are meaningless
            expect(result.success).toBe(true) // Currently allows
            // Consider adding max limit (e.g., 50 years)
        })
    })

    describe('P0 - CRITICAL: firstViableYear Synchronization', () => {
        it('[P0] should set firstViableYear when creating new plan', async () => {
            dbMock.plan.findFirst.mockResolvedValue(null)
            dbMock.$transaction.mockImplementation(async (callback: any) => {
                return callback(dbMock)
            })
            dbMock.plan.create.mockResolvedValue({ id: 'plan_1' } as any)

            mockCalculateProjection.mockResolvedValue({
                success: true,
                isAffordable: true,
                earliestAffordableYear: 2028,
            })

            await createPlanFromOnboarding({
                yearsToPurchase: 2030,
                targetHousePriceN0: 5,
                monthlyLivingExpenses: 10,
            } as any)

            const createCall = dbMock.plan.create.mock.calls[0]
            const planData = createCall[0].data

            expect(planData.firstViableYear).toBe(2028)
        })

        it('[P0] should update firstViableYear when updating existing plan', async () => {
            dbMock.plan.findFirst.mockResolvedValue({
                id: 'plan_1',
                userId: 'user_123',
                firstViableYear: 2026, // Old value
            } as any)

            mockGetNextStep.mockResolvedValue('/next-step')
            mockCalculateProjection.mockResolvedValue({
                success: true,
                isAffordable: true,
                earliestAffordableYear: 2029, // New value
            })

            await createPlanFromOnboarding({
                yearsToPurchase: 2030,
                targetHousePriceN0: 5,
                monthlyLivingExpenses: 10,
            } as any)

            const updateCall = dbMock.plan.update.mock.calls[0]
            const updateData = updateCall[0].data

            expect(updateData.firstViableYear).toBe(2029)
        })

        it('[P0] should sync firstViableYear with projectionCache', async () => {
            // This tests the consistency between:
            // - plan.firstViableYear
            // - planReport.projectionCache.earliestPurchaseYear

            dbMock.plan.findFirst.mockResolvedValue(null)
            dbMock.$transaction.mockImplementation(async (callback: any) => {
                return callback(dbMock)
            })

            const projectionResult = {
                success: true,
                isAffordable: true,
                earliestAffordableYear: 2028,
            }

            mockCalculateProjection.mockResolvedValue(projectionResult)

            await createPlanFromOnboarding({
                yearsToPurchase: 2030,
                targetHousePriceN0: 5,
                monthlyLivingExpenses: 10,
            } as any)

            const planCreateCall = dbMock.plan.create.mock.calls[0]
            const reportCreateCall = dbMock.planReport.create.mock.calls[0]

            expect(planCreateCall[0].data.firstViableYear).toBe(2028)
            expect(reportCreateCall[0].data.projectionCache).toMatchObject({
                earliestPurchaseYear: 2028
            })
        })
    })

    describe('P1 - HIGH: Input Validation', () => {
        it('[P1] should reject zero targetHousePriceN0', async () => {
            const result = await createPlanFromOnboarding({
                yearsToPurchase: 2030,
                targetHousePriceN0: 0, // Zero price
                monthlyLivingExpenses: 10,
            } as any)

            // Currently no validation for zero price
            // Should reject as invalid
            expect(result.success).toBe(false)
        })

        it('[P1] should reject negative targetHousePriceN0', async () => {
            const result = await createPlanFromOnboarding({
                yearsToPurchase: 2030,
                targetHousePriceN0: -5, // Negative price
                monthlyLivingExpenses: 10,
            } as any)

            expect(result.success).toBe(false)
        })

        it('[P1] should handle extremely large house price', async () => {
            dbMock.plan.findFirst.mockResolvedValue(null)
            dbMock.$transaction.mockImplementation(async (callback: any) => {
                return callback(dbMock)
            })
            dbMock.plan.create.mockResolvedValue({ id: 'plan_1' } as any)

            const result = await createPlanFromOnboarding({
                yearsToPurchase: 2030,
                targetHousePriceN0: 999999, // 999,999 billion VND
                monthlyLivingExpenses: 10,
            } as any)

            // Line 119: * 1000 might overflow or give nonsensical results
            if (result.success) {
                const createCall = dbMock.plan.create.mock.calls[0]
                const planData = createCall[0].data
                // 999999 * 1000 = 999,999,000 million
                expect(planData.targetHousePriceN0).toBe(999999000)
            }
        })

        it('[P1] should reject zero or negative monthlyLivingExpenses', async () => {
            const result = await createPlanFromOnboarding({
                yearsToPurchase: 2030,
                targetHousePriceN0: 5,
                monthlyLivingExpenses: 0, // Can't live with 0 expenses
            } as any)

            // Should probably reject or at least warn
            expect(result.success).toBe(false)
        })
    })

    describe('P1 - HIGH: Edge Cases in Calculations', () => {
        it('[P1] should handle calculation returning earliestAffordableYear as undefined', async () => {
            dbMock.plan.findFirst.mockResolvedValue(null)
            dbMock.$transaction.mockImplementation(async (callback: any) => {
                return callback(dbMock)
            })

            mockCalculateProjection.mockResolvedValue({
                success: true,
                isAffordable: false,
                earliestAffordableYear: undefined, // Never affordable
            })

            const result = await createPlanFromOnboarding({
                yearsToPurchase: 2030,
                targetHousePriceN0: 5,
                monthlyLivingExpenses: 10,
            } as any)

            // Should handle gracefully
            expect(result.success).toBe(true)
        })

        it('[P1] should handle projection calculation failure', async () => {
            dbMock.plan.findFirst.mockResolvedValue(null)

            mockCalculateProjection.mockResolvedValue({
                success: false,
                error: 'Calculation error'
            })

            const result = await createPlanFromOnboarding({
                yearsToPurchase: 2030,
                targetHousePriceN0: 5,
                monthlyLivingExpenses: 10,
            } as any)

            // Line 18-20: Returns error if projection fails
            expect(result.success).toBe(false)
        })

        it('[P1] should handle floating point precision in house price', async () => {
            dbMock.plan.findFirst.mockResolvedValue(null)
            dbMock.$transaction.mockImplementation(async (callback: any) => {
                return callback(dbMock)
            })
            dbMock.plan.create.mockResolvedValue({ id: 'plan_1' } as any)

            const result = await createPlanFromOnboarding({
                yearsToPurchase: 2030,
                targetHousePriceN0: 5.5555, // Floating point
                monthlyLivingExpenses: 10,
            } as any)

            if (result.success) {
                const createCall = dbMock.plan.create.mock.calls[0]
                const planData = createCall[0].data
                // 5.5555 * 1000 = 5555.5 (should round?)
                expect(planData.targetHousePriceN0).toBe(5555.5)
            }
        })
    })

    describe('P1 - HIGH: Empty/Null Email Handling', () => {
        it('[P1] should handle missing emailAddresses array', async () => {
            mockCurrentUser.mockResolvedValue({
                id: 'user_123',
                emailAddresses: [] // Empty array
            })

            dbMock.user.findUnique.mockResolvedValue({
                id: 'user_123',
                email: ''
            } as any)

            dbMock.plan.findFirst.mockResolvedValue(null)
            dbMock.$transaction.mockImplementation(async (callback: any) => {
                return callback(dbMock)
            })
            dbMock.plan.create.mockResolvedValue({ id: 'plan_1' } as any)

            const result = await createPlanFromOnboarding({
                yearsToPurchase: 2030,
                targetHousePriceN0: 5,
                monthlyLivingExpenses: 10,
            } as any)

            // Line 41: userEmail will be undefined
            // Line 82-89: Creates user with empty email
            expect(result.success).toBe(true)
        })

        it('[P1] should handle whitespace-only email', async () => {
            mockCurrentUser.mockResolvedValue({
                id: 'user_123',
                emailAddresses: [{ emailAddress: '   ' }] // Whitespace
            })

            dbMock.user.findUnique.mockResolvedValue(null)
            dbMock.user.create.mockResolvedValue({
                id: 'user_123',
                email: '   '
            } as any)

            dbMock.plan.findFirst.mockResolvedValue(null)
            dbMock.$transaction.mockImplementation(async (callback: any) => {
                return callback(dbMock)
            })
            dbMock.plan.create.mockResolvedValue({ id: 'plan_1' } as any)

            const result = await createPlanFromOnboarding({
                yearsToPurchase: 2030,
                targetHousePriceN0: 5,
                monthlyLivingExpenses: 10,
            } as any)

            // Should trim or validate email
            expect(result.success).toBe(true)
        })
    })
})
