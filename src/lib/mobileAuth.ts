import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { auth } from '@clerk/nextjs/server';

const JWT_SECRET = process.env.CLERK_SECRET_KEY || 'mobile_auth_secret_fallback_12345';

/**
 * Helper function to verify authentication from both:
 * 1. Custom Mobile JWT (HS256) - Long lived
 * 2. Clerk Session Token (RS256) - Short lived (via auth())
 * 
 * @param req NextRequest object
 * @returns userId if authenticated, null otherwise
 */
export async function verifyMobileToken(req: NextRequest): Promise<string | null> {
    // 1. Try Custom JWT first (from Header)
    const authHeader = req.headers.get('authorization');
    if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        try {
            const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as any;
            if (decoded && decoded.userId) {
                // Check Blacklist
                if (decoded.jti) {
                    const { db } = await import('@/lib/db');
                    const blacklisted = await db.tokenBlacklist.findUnique({
                        where: { jti: decoded.jti }
                    });

                    if (blacklisted) {
                        console.log('[MOBILE_AUTH_HELPER] Token blacklisted:', decoded.jti);
                        return null;
                    }
                }

                // console.log('[MOBILE_AUTH_HELPER] Custom JWT verified for user:', decoded.userId);
                return decoded.userId;
            }
        } catch (err) {
            // Token invalid or expired, or wrong algorithm (RS256)
            // console.log('[MOBILE_AUTH_HELPER] Custom JWT verification failed, falling back to Clerk...', (err as Error).message);
        }
    }

    // 2. Fallback to Clerk Auth
    try {
        const { userId } = await auth();
        if (userId) {
            // console.log('[MOBILE_AUTH_HELPER] Clerk Auth verified for user:', userId);
            return userId;
        }
    } catch (err) {
        console.error('[MOBILE_AUTH_HELPER] Clerk Auth failed:', err);
    }

    return null;
}
