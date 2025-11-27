import { PATCH } from '@/app/api/plans/[planId]/section/route'
import { db } from '@/lib/db'
import { auth } from '@clerk/nextjs/server'
import { NextRequest } from 'next/server'
import { runProjectionWithEngine } from '@/actions/projectionHelpers'
import { updateSpending, updateFamilySupport, updateAssumptions, invalidateReportCache } from '@/lib/services/planService'

// Mock dependencies
jest.mock('@/lib/db')
jest.mock('@clerk/nextjs/server', () => ({
    auth: jest.fn(),
}))
jest.mock('@/lib/logger', () => ({
    error: jest.fn(),
    info: jest.fn(),
}))
jest.mock('@/actions/projectionHelpers', () => ({
    runProjectionWithEngine: jest.fn(),
}))
jest.mock('@/lib/services/planService', () => ({
    updateSpending: jest.fn(),
    updateFamilySupport: jest.fn(),
    updateAssumptions: jest.fn(),
    invalidateReportCache: jest.fn(),
    updateSpendingSchema: { parse: (data: any) => data }, // Simple mock
    updateFamilySupportSchema: { parse: (data: any) => data },
    updateAssumptionsSchema: { parse: (data: any) => data },
}))
// Mock mobileAuth
jest.mock('@/lib/mobileAuth', () => ({
    verifyMobileToken: jest.fn().mockResolvedValue('user_1'),
}))


// Mock Next.js server components (Reuse from crud.test.ts)
jest.mock('next/server', () => {
    class MockNextResponse {
        status: number
        body: any

        constructor(body: any, init: any) {
            this.body = body
            this.status = init?.status || 200
        }

        async json() {
            return this.body
        }

        static json(body: any, init: any) {
            return new MockNextResponse(body, init)
        }
    }

    return {
        NextResponse: MockNextResponse,
        NextRequest: jest.fn().mockImplementation((url, init) => ({
            url,
            nextUrl: new URL(url),
            json: async () => {
                if (typeof init?.body === 'string') return JSON.parse(init.body)
                return init?.body || {}
            },
            ...init
        }))
    }
})

// Helper to mock NextRequest
function createMockRequest(url: string, options: any = {}) {
    return {
        url,
        nextUrl: new URL(url),
        json: async () => {
            if (typeof options.body === 'string') {
                return JSON.parse(options.body)
            }
            return options.body || {}
        },
        ...options
    } as any
}

describe('API Flow: Onboarding Section Update', () => {
    const mockDb = db as any
    const mockRunProjection = runProjectionWithEngine as jest.Mock

    beforeEach(() => {
        jest.clearAllMocks()
        // Default mocks
        mockDb.plan.findUnique.mockResolvedValue({
            id: 'plan_1',
            userId: 'user_1',
            firstViableYear: 2030,
            confirmedPurchaseYear: 2030
        })
        mockDb.planReport.findUnique.mockResolvedValue({
            planId: 'plan_1',
            projectionCache: { earliestPurchaseYear: 2030 }
        })
        mockRunProjection.mockResolvedValue({
            earliestPurchaseYear: 2030,
            projections: [],
            isAffordable: true
        })
        mockDb.$transaction.mockImplementation((callback: any) => {
            if (Array.isArray(callback)) return Promise.all(callback)
            return callback(mockDb)
        })
        mockDb.planReport.upsert.mockResolvedValue({})
        mockDb.plan.update.mockResolvedValue({})
        mockDb.onboardingProgress.updateMany.mockResolvedValue({})
    })

    describe('PATCH /api/plans/[planId]/section', () => {
        it('should update SPENDING section and recalculate', async () => {
            const req = createMockRequest('http://localhost:3000/api/plans/plan_1/section', {
                method: 'PATCH',
                body: JSON.stringify({
                    section: 'spending',
                    data: { monthlyNonHousingDebt: 500 }
                })
            })
            const params = { params: Promise.resolve({ planId: 'plan_1' }) }

            // Mock change in projection (worse)
            mockRunProjection.mockResolvedValueOnce({
                earliestPurchaseYear: 2035, // 5 years later
                projections: [],
                isAffordable: true
            })

            const res = await PATCH(req, params as any)
            const data = await res.json()

            expect(res.status).toBe(200)
            expect(updateSpending).toHaveBeenCalledWith('plan_1', 'user_1', expect.anything())
            expect(mockRunProjection).toHaveBeenCalledWith('plan_1')
            expect(data.result.hasWorsened).toBe(true)
            expect(data.section).toBe('spending')

            // Verify DB updates
            expect(mockDb.planReport.upsert).toHaveBeenCalled()
            expect(mockDb.plan.update).toHaveBeenCalled()
            expect(mockDb.onboardingProgress.updateMany).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({ spendingState: 'COMPLETED' })
            }))
        })

        it('should update FAMILY SUPPORT section and recalculate', async () => {
            const req = createMockRequest('http://localhost:3000/api/plans/plan_1/section', {
                method: 'PATCH',
                body: JSON.stringify({
                    section: 'familySupport',
                    data: { hasFamilySupport: true, familySupportAmount: 10000 }
                })
            })
            const params = { params: Promise.resolve({ planId: 'plan_1' }) }

            // Mock change in projection (better)
            mockRunProjection.mockResolvedValueOnce({
                earliestPurchaseYear: 2025, // 5 years earlier
                projections: [],
                isAffordable: true
            })

            const res = await PATCH(req, params as any)
            const data = await res.json()

            expect(res.status).toBe(200)
            expect(updateFamilySupport).toHaveBeenCalledWith('plan_1', 'user_1', expect.anything())
            expect(data.result.hasImproved).toBe(true)
            expect(data.section).toBe('familySupport')
        })

        it('should update ASSUMPTIONS section and recalculate', async () => {
            const req = createMockRequest('http://localhost:3000/api/plans/plan_1/section', {
                method: 'PATCH',
                body: JSON.stringify({
                    section: 'assumptions',
                    data: { pctSalaryGrowth: 5 }
                })
            })
            const params = { params: Promise.resolve({ planId: 'plan_1' }) }

            const res = await PATCH(req, params as any)
            const data = await res.json()

            expect(res.status).toBe(200)
            expect(updateAssumptions).toHaveBeenCalledWith('plan_1', 'user_1', expect.anything())
            expect(data.section).toBe('assumptions')
            expect(data.result.caseNumber).toBeDefined()
        })

        it('should return 400 for unknown section', async () => {
            const req = createMockRequest('http://localhost:3000/api/plans/plan_1/section', {
                method: 'PATCH',
                body: JSON.stringify({
                    section: 'unknown_section',
                    data: {}
                })
            })
            const params = { params: Promise.resolve({ planId: 'plan_1' }) }

            const res = await PATCH(req, params as any)

            // Zod enum validation should fail
            expect(res.status).toBe(400)
        })
    })
})
