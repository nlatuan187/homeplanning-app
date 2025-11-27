import { calculateOnboardingProjection } from '@/actions/calculateOnboardingProjection'
import { generateProjections } from '@/lib/calculations/projections/generateProjections'

// Mock the projection engine
jest.mock('@/lib/calculations/projections/generateProjections', () => ({
    generateProjections: jest.fn(),
}))

describe('calculateOnboardingProjection', () => {
    const mockGenerateProjections = generateProjections as jest.Mock

    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('should return error for invalid input', async () => {
        const result = await calculateOnboardingProjection({})
        expect(result.success).toBe(false)
        expect(result.error).toBe('Invalid input')
    })

    it('should return error for invalid yearsToPurchase', async () => {
        const result = await calculateOnboardingProjection({
            yearsToPurchase: 2020, // Past year
            targetHousePriceN0: 5,
            initialSavings: 100,
            userMonthlyIncome: 20,
            monthlyLivingExpenses: 10,
        })
        expect(result.success).toBe(false)
        expect(result.error).toBe('Invalid yearsToPurchase')
    })

    it('should map data correctly and return success', async () => {
        // Mock engine response
        mockGenerateProjections.mockReturnValue([
            { year: 2028, isAffordable: true },
            { year: 2029, isAffordable: true },
        ])

        const currentYear = new Date().getFullYear()
        const targetYear = currentYear + 3

        const input = {
            yearsToPurchase: targetYear,
            targetHousePriceN0: 5, // 5 billion
            initialSavings: 500,
            userMonthlyIncome: 30,
            monthlyLivingExpenses: 10,
        }

        const result = await calculateOnboardingProjection(input)

        expect(result.success).toBe(true)
        expect(result.earliestAffordableYear).toBe(2028)
        expect(result.selectedPurchaseYear).toBe(targetYear)

        // Verify engine was called with converted units (billion -> million, etc if needed)
        // The code multiplies targetHousePriceN0 by 1000 (5 * 1000 = 5000)
        expect(mockGenerateProjections).toHaveBeenCalledWith(expect.objectContaining({
            targetHousePriceN0: 5000,
            initialSavings: 500,
            userMonthlyIncome: 30,
            monthlyLivingExpenses: 10,
            confirmedPurchaseYear: targetYear,
        }))
    })
})
