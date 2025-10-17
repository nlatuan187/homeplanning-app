// src/app/api/auth/sign-up/route.ts
import { NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { z } from 'zod';

// Schema để validate dữ liệu từ client
const signUpSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  emailAddress: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
});

/**
 * @swagger
 * /auth/sign-up:
 *   post:
 *     summary: Register a new user manually
 *     description: Creates a new user in the Clerk system using email and password. This endpoint is public.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName: { type: 'string' }
 *               lastName: { type: 'string' }
 *               emailAddress: { type: 'string', format: 'email' }
 *               password: { type: 'string', format: 'password' }
 *     responses:
 *       '201':
 *         description: User created successfully.
 *       '400':
 *         description: Bad Request - Invalid input data or user already exists.
 *       '500':
 *         description: Internal Server Error.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 1. Validate dữ liệu
    const validation = signUpSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Invalid input", details: validation.error.format() }, { status: 400 });
    }

    const { firstName, lastName, emailAddress, password } = validation.data;

    // 2. Gọi Clerk Backend SDK để tạo người dùng
    const newUser = await (await clerkClient()).users.createUser({
      firstName,
      lastName,
      emailAddress: [emailAddress],
      password,
    });

    await (await clerkClient()).users.updateUser(newUser.id, {
      publicMetadata: { "auto_verified": true }
    });

    // 3. Trả về thành công
    return NextResponse.json({ success: true, userId: newUser.id }, { status: 201 });

  } catch (error: any) {
    if (error.errors && error.errors[0].code === 'form_identifier_exists') {
        return NextResponse.json({ error: "Email này đã được sử dụng." }, { status: 400 });
    }

    console.error('[API_SIGN_UP_ERROR]', JSON.stringify(error, null, 2));
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}