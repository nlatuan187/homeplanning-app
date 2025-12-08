import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user and invalidate session
 *     description: |
 *       Logs out the current user and invalidates their session.
 *       For mobile apps, this should clear stored tokens.
 *     tags: [Authentication]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       '200':
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Logged out successfully"
 *       '401':
 *         description: Unauthorized - No valid session
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "No active session"
 */
export async function POST(req: Request) {
  try {
    const { userId, sessionId } = await auth();

    if (!userId || !sessionId) {
      return NextResponse.json({
        error: 'No active session'
      }, { status: 401 });
    }

    // Revoke the Clerk session
    try {
      const client = await clerkClient();
      await client.sessions.revokeSession(sessionId);
    } catch (error) {
      console.error('[LOGOUT_REVOKE_ERROR]', error);
      // Continue to return success to client even if revocation fails
      // as the client should clear their own tokens regardless.
    }

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('[LOGOUT_ERROR]', error);
    return NextResponse.json({
      error: 'Logout failed'
    }, { status: 500 });
  }
}

export async function OPTIONS(req: Request) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    },
  });
}

