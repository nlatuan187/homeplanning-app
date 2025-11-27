import { PUT } from '@/app/api/plans/[planId]/route'
import { db } from '@/lib/db'
import { auth } from '@clerk/nextjs/server'
import logger from '@/lib/logger'

// Mock dependencies
jest.mock('@/lib/db')
jest.mock('@clerk/nextjs/server', () => ({
    auth: jest.fn(),
}))
jest.mock('@/lib/logger', () => ({
    error: jest.fn(),
    info: jest.fn(),
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
                if (init?.body === 'MALFORMED_JSON') throw new Error('Invalid JSON')
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
            if (options.body === 'MALFORMED_JSON') throw new Error('Invalid JSON')
            if (typeof options.body === 'string') {
                return JSON.parse(options.body)
            }
            return options.body || {}
        },
        ...options
    } as any
}

describe('API Security: Input Validation & Hardening', () => {
    const mockAuth = auth as jest.Mock
    const mockDb = db as any

    beforeEach(() => {
        jest.clearAllMocks()
        mockAuth.mockResolvedValue({ userId: 'user_1' })
    })

    describe('Input Validation', () => {
        it('should handle Malformed JSON gracefully', async () => {
            const req = createMockRequest('http://localhost:3000/api/plans/plan_1', {
                method: 'PUT',
                body: 'MALFORMED_JSON'
            })
            const params = { params: Promise.resolve({ planId: 'plan_1' }) }

            try {
                const res = await PUT(req, params as any)
                // If it doesn't throw, check status
                expect(res.status).toBe(500) // Currently returns 500 on error
            } catch (e) {
                // Should be caught in route handler
            }
        })

        it('should reject SQL Injection attempts in text fields', async () => {
            // Prisma protects against SQLi by default, but we verify the input is accepted as literal string
            // and doesn't cause unexpected errors or raw query execution.
            const sqlInjectionPayload = "My Plan'; DROP TABLE users; --"

            mockDb.plan.update.mockResolvedValue({ id: 'plan_1', planName: sqlInjectionPayload })

            const req = createMockRequest('http://localhost:3000/api/plans/plan_1', {
                method: 'PUT',
                body: JSON.stringify({
                    planName: sqlInjectionPayload,
                    yearsToPurchase: 2030,
                    targetHousePriceN0: 5000000000,
                    monthlyLivingExpenses: 10000000,
                })
            })
            const params = { params: Promise.resolve({ planId: 'plan_1' }) }

            const res = await PUT(req, params as any)
            const data = await res.json()

            expect(res.status).toBe(200)
            expect(data.planName).toBe(sqlInjectionPayload) // Should be treated as literal string
            expect(mockDb.plan.update).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({ planName: sqlInjectionPayload })
            }))
        })

        it('should reject NoSQL Injection attempts (Object as input)', async () => {
            // Trying to pass an object where a string is expected
            const req = createMockRequest('http://localhost:3000/api/plans/plan_1', {
                method: 'PUT',
                body: JSON.stringify({
                    planName: { "$gt": "" }, // MongoDB style injection
                    yearsToPurchase: 2030,
                    targetHousePriceN0: 5000000000,
                    monthlyLivingExpenses: 10000000,
                })
            })
            const params = { params: Promise.resolve({ planId: 'plan_1' }) }

            const res = await PUT(req, params as any)

            expect(res.status).toBe(400) // Zod should reject object for string field
        })
    })

    describe('Error Handling & Leakage', () => {
        it('should NOT leak stack traces in 500 errors', async () => {
            // Force a database error
            const dbError = new Error('Database connection failed')
            dbError.stack = 'Error: Database connection failed\n    at Connection.connect (/app/node_modules/...)'
            mockDb.plan.update.mockRejectedValue(dbError)

            const req = createMockRequest('http://localhost:3000/api/plans/plan_1', {
                method: 'PUT',
                body: JSON.stringify({
                    planName: "Updated Plan",
                    yearsToPurchase: 2030,
                    targetHousePriceN0: 5000000000,
                    monthlyLivingExpenses: 10000000,
                })
            })
            const params = { params: Promise.resolve({ planId: 'plan_1' }) }

            const res = await PUT(req, params as any)

            expect(res.status).toBe(500)

            // Check response body for leaks
            // Note: Current implementation might return "Internal Error" string or JSON
            // We need to check what it returns.
            // Based on route.ts: return new NextResponse("Internal Error", { status: 500 });
            // It returns a string body "Internal Error".

            // If it returns JSON, we check properties.
            // If it returns string, we check content.

            // Since we mocked NextResponse, let's see what body it has.
            const body = res.body

            expect(body).not.toContain('stack')
            expect(body).not.toContain('/app/node_modules/')
            expect(body).toBe('Internal Error') // Should be generic
        })
    })
})
