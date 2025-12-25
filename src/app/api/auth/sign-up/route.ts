// src/app/api/auth/sign-up/route.ts
import { NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { z } from 'zod';
import { db } from '@/lib/db';

// Schema để validate dữ liệu từ client
const signUpSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  emailAddress: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
  passwordVerification: z.string().min(8, "Password verification must be at least 8 characters long"),
});

/**
 * @swagger
 * /api/auth/sign-up:
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
 *               passwordVerification: { type: 'string', format: 'password' }
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

    const { firstName, lastName, emailAddress, password, passwordVerification } = validation.data;

    if (password !== passwordVerification) {
      return NextResponse.json({ error: "Password and password verification do not match" }, { status: 400 });
    }

    // 2. Gọi Clerk Backend SDK để tạo người dùng
    const newUser = await (await clerkClient()).users.createUser({
      firstName,
      lastName,
      emailAddress: [emailAddress],
      password,
    });

    // 3. Tạo user trong database local để đồng bộ
    // Sử dụng upsert để xử lý trường hợp email đã tồn tại trong DB local (nhưng không có trong Clerk)
    // Trường hợp này xảy ra nếu database không đồng bộ hoàn toàn với Clerk (VD: xoá user bên Clerk nhưng chưa xoá DB)
    await db.user.upsert({
      where: { email: emailAddress },
      update: {
        id: newUser.id, // Update ID mới từ Clerk liên kết với email cũ
      },
      create: {
        id: newUser.id,
        email: emailAddress,
      }
    });

    // 4. Trả về thành công
    return NextResponse.json({ success: true, userId: newUser.id }, { status: 201 });

  } catch (error: any) {
    // Xử lý lỗi email đã tồn tại
    if (error.errors && error.errors[0]?.code === 'form_identifier_exists') {
      return NextResponse.json({ error: "Email này đã được sử dụng." }, { status: 400 });
    }

    // Xử lý lỗi mật khẩu bị lộ (pwned)
    if (error.errors && error.errors[0]?.code === 'form_password_pwned') {
      return NextResponse.json({
        error: "Mật khẩu này đã bị lộ trong một vụ rò rỉ dữ liệu trước đây. Để bảo vệ tài khoản của bạn, vui lòng chọn mật khẩu khác."
      }, { status: 422 });
    }

    console.error('[API_SIGN_UP_ERROR]', JSON.stringify(error, null, 2));
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}