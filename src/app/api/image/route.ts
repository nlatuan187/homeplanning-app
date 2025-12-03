import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import mime from "mime-types";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const fileUrl = searchParams.get("url");

  if (!fileUrl) {
    return NextResponse.json({ error: "Image URL is required" }, { status: 400 });
  }

  const sanitizedUrl = path.normalize(fileUrl).replace(/^(\.\.(\/|\\|$))+/, "");
  const publicDir = path.join(process.cwd(), "public");
  const filePath = path.join(publicDir, sanitizedUrl);

  if (!filePath.startsWith(publicDir)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    if (fs.existsSync(filePath)) {
      const fileName = path.basename(sanitizedUrl);

      // --- XỬ LÝ ĐẶC BIỆT CHO FILE .LOTTIE ---
      if (filePath.endsWith(".lottie")) {
        // 1. Đọc file dưới dạng văn bản (utf-8)
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        
        try {
          // 2. Parse nó như một file JSON
          const jsonData = JSON.parse(fileContent);
          // 3. Trả về như một response JSON. Trình duyệt sẽ tự động hiển thị dạng text.
          return NextResponse.json(jsonData);
        } catch (jsonError) {
          // Nếu parse lỗi (vì file .lottie là file zip thật) thì báo lỗi
          console.error("Lỗi: File .lottie không phải là định dạng JSON hợp lệ:", fileName, jsonError);
          return NextResponse.json({ error: "File lottie không thể đọc được dưới dạng JSON." }, { status: 500 });
        }
      }

      // --- XỬ LÝ MẶC ĐỊNH CHO CÁC FILE KHÁC (ảnh, v.v.) ---
      const fileBuffer = fs.readFileSync(filePath);
      const mimeType = mime.lookup(filePath) || "application/octet-stream";
      const blob = new Blob([fileBuffer]);

      return new Response(blob, {
        status: 200,
        headers: {
          "Content-Type": mimeType,
          "Content-Length": blob.size.toString(),
          "Content-Disposition": `inline; filename="${fileName}"`,
        },
      });

    } else {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
  } catch (error) {
    console.error("Failed to read image file:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}