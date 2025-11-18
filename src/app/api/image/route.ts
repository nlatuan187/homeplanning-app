import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import mime from "mime-types";

/**
 * @swagger
 * /api/image:
 *   get:
 *     summary: Lấy file tĩnh từ thư mục public
 *     description: >
 *       API này dùng để lấy một tài nguyên tĩnh (như ảnh hoặc file Lottie JSON) từ thư mục `public` của server.
 *       Điều này rất hữu ích cho các client mobile cần một URL trực tiếp để truy cập tài sản media.
 *       Đường dẫn file được cung cấp trong tham số 'url' phải là đường dẫn tương đối so với thư mục 'public'.
 *     tags:
 *       - Media
 *     parameters:
 *       - in: query
 *         name: url
 *         required: true
 *         schema:
 *           type: string
 *         description: >
 *           Đường dẫn đến file, tính từ thư mục `/public`.
 *           Ví dụ: `onboarding/hanoi-chungcu.png` hoặc `lottie/animation.json`.
 *     responses:
 *       '200':
 *         description: Trả về file được yêu cầu. Content-Type sẽ được tự động xác định.
 *         content:
 *           image/*:
 *             schema:
 *               type: string
 *               format: binary
 *           application/json:
 *             schema:
 *               type: object
 *       '400':
 *         description: Bad Request. Thiếu tham số 'url'.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Image URL is required
 *       '403':
 *         description: Forbidden. Yêu cầu truy cập một đường dẫn nằm ngoài thư mục public.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Forbidden
 *       '404':
 *         description: Not Found. Không tìm thấy file được yêu cầu.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Image not found
 *       '500':
 *         description: Internal Server Error. Lỗi server khi đọc file.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Internal Server Error
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const fileUrl = searchParams.get("url");

  if (!fileUrl) {
    return new NextResponse(JSON.stringify({ error: "Image URL is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // --- Biện pháp bảo mật: Chống lại Directory Traversal Attack ---
  // Chuẩn hóa đường dẫn và loại bỏ các ký tự "../" ở đầu
  const sanitizedUrl = path.normalize(fileUrl).replace(/^(\.\.(\/|\\|$))+/, "");

  const publicDir = path.join(process.cwd(), "public");
  const filePath = path.join(publicDir, sanitizedUrl);

  // Kiểm tra cuối cùng để đảm bảo đường dẫn vẫn nằm trong thư mục public
  if (!filePath.startsWith(publicDir)) {
    return new NextResponse(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    if (fs.existsSync(filePath)) {
      const fileBuffer = fs.readFileSync(filePath);
      const mimeType = mime.lookup(filePath) || "application/octet-stream";

      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          "Content-Type": mimeType,
          "Content-Length": fileBuffer.length.toString(),
        },
      });
    } else {
      return new NextResponse(JSON.stringify({ error: "Image not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    console.error("Failed to read image file:", error);
    return new NextResponse(
      JSON.stringify({ error: "Internal Server Error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
