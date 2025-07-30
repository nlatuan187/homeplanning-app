// app/api/save-user/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { id, email, createdAt, updatedAt } = await req.json();

    if (!id || !email) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Kiểm tra xem user đã có trong DB chưa
    const existingUser = await db.user.findUnique({ where: { id } });

    if (!existingUser) {
      await db.user.create({
        data: {
          id,
          email,
          createdAt,
          updatedAt,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("SAVE_USER_API", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
