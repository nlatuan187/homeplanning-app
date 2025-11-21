import { NextResponse } from 'next/server';

/**
 * @swagger
 * /api/auth/exchange:
 *   post:
 *     summary: Exchange Ticket for Session Token
 *     description: Proxies the ticket exchange request to Clerk FAPI.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ticket
 *             properties:
 *               ticket:
 *                 type: string
 *                 description: The sign-in ticket received from /api/auth/sign-in
 *     responses:
 *       '200':
 *         description: Exchange successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sessionToken:
 *                   type: string
 *                   description: The short-lived session token
 *       '400':
 *         description: Missing ticket
 *       '500':
 *         description: Exchange failed
 */
export async function POST(req: Request) {
    try {
        const { ticket } = await req.json();

        if (!ticket) {
            return NextResponse.json({ error: 'Ticket is required' }, { status: 400 });
        }

        // Cấu hình FAPI URL
        // Trong production, đây thường là clerk.your-domain.com
        // Bạn có thể đưa vào biến môi trường NEXT_PUBLIC_CLERK_FAPI_URL nếu muốn linh động
        const fapiUrl = 'https://clerk.muanha.finful.co/v1/client/sign_ins?';

        console.log(`Exchanging ticket at ${fapiUrl}...`);

        const response = await fetch(fapiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                strategy: 'ticket',
                ticket: ticket,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Clerk FAPI Error:', data);
            return NextResponse.json({
                error: 'Failed to exchange ticket',
                details: data
            }, { status: response.status });
        }

        // Trích xuất session token từ response của Clerk
        // Cấu trúc response của Clerk có thể thay đổi, nhưng thường sẽ có trong created_session_id hoặc sessions
        // Tuy nhiên, FAPI trả về client object, ta cần lấy token từ session

        // Lấy session ID vừa tạo
        const createdSessionId = data.client?.sessions?.[0]?.id;

        if (!createdSessionId) {
            // Fallback nếu không tìm thấy session ID, trả về nguyên data để client debug
            return NextResponse.json(data);
        }

        // Nếu muốn lấy JWT token luôn, ta phải gọi thêm 1 bước nữa hoặc client tự làm
        // Nhưng ở đây ta trả về data từ Clerk để client tự xử lý hoặc lấy token từ response nếu có

        return NextResponse.json(data);

    } catch (error) {
        console.error('[AUTH_EXCHANGE_ERROR]', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
