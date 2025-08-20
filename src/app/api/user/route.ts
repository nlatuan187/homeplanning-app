// app/api/save-user/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth, currentUser } from "@clerk/nextjs/server";

export async function POST(req: Request) {
  try {
    // Lấy thông tin user từ Clerk
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const user = await currentUser();
    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    // Lấy primary email
    const primaryEmailObject = user.emailAddresses.find(e => e.id === user.primaryEmailAddressId);
    const userEmail = primaryEmailObject?.emailAddress;
    
    if (!userEmail) {
      console.error(`Clerk user ${user.id} has no primary email address.`);
      return new NextResponse("User email not found", { status: 400 });
    }

    // BẮT ĐẦU LOGIC UPSERT MẠNH MẼ
    // Bước 1: Tìm user trong DB bằng Clerk ID (id trong bảng User)
    let dbUser = await db.user.findUnique({ 
      where: { id: user.id }, 
    });

    if (dbUser) {
      // User đã tồn tại với Clerk ID đúng, chỉ cần đảm bảo email được cập nhật nếu nó thay đổi
      if (dbUser.email !== userEmail) {
        dbUser = await db.user.update({
          where: { id: user.id },
          data: { email: userEmail },
        });
      }
    } else {
      // Không tìm thấy user bằng Clerk ID -> có thể là user cũ hoặc user mới hoàn toàn
      // Bước 2: Thử tìm bằng email
      const userByEmail = await db.user.findUnique({ 
        where: { email: userEmail }, 
      });

      if (userByEmail) {
        // Email đã tồn tại -> đây là user cũ với Clerk ID cũ.
        // Cập nhật record này với Clerk ID mới.
        dbUser = await db.user.update({
          where: { email: userEmail },
          data: { 
            id: user.id, // Cập nhật Clerk ID
          },
        });
      } else {
        // Không tìm thấy bằng cả ID và email -> đây là user mới hoàn toàn.
        // Bước 3: Tạo mới user
        dbUser = await db.user.create({
          data: {
            id: user.id,
            email: userEmail,
          },
        });
      }
    }
    // ---- KẾT THÚC LOGIC UPSERT

    return NextResponse.json(dbUser, { status: 200 }); // Trả về 200 OK vì đây là một hoạt động upsert
  } catch (error) {
    console.error("API Error syncing user:", error);
    // Trả về lỗi chi tiết hơn nếu có thể
    if (error instanceof Error) {
      return new NextResponse(error.message, { status: 500 });
    }
    return new NextResponse("Internal Error", { status: 500 });
  }
}
