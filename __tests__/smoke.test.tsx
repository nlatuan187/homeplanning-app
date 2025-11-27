import { render, screen } from '@testing-library/react'
import { dbMock } from '@/lib/__mocks__/db'

describe('Smoke Test', () => {
    it('should pass basic math', () => {
        expect(1 + 1).toBe(2)
    })

    it('should mock prisma', async () => {
        dbMock.user.findMany.mockResolvedValue([{ id: '1', email: 'test@example.com' } as any])

        const users = await dbMock.user.findMany()
        expect(users).toHaveLength(1)
        expect(users[0].email).toBe('test@example.com')
    })
})
