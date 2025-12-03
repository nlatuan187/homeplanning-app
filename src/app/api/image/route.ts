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
// 1. Định nghĩa Metadata
const LOTTIE_METADATA: Record<string, { title: string; description: string }> = {
  "Market chung cư HCM_Scene 2.lottie": {
    title: "Thị trường Chung cư TP.HCM - Scene 2",
    description: "Biểu đồ tăng trưởng giá chung cư tại khu vực Hồ Chí Minh."
  },
  // Thêm các file khác...
};

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
      const fileName = path.basename(filePath);
      const fileBuffer = fs.readFileSync(filePath);
      
      // --- TRƯỜNG HỢP ĐẶC BIỆT CHO FILE .LOTTIE ---
      if (filePath.endsWith(".lottie")) {
        const metadata = LOTTIE_METADATA[fileName] || { 
          title: fileName, 
          description: "No description available" 
        };

        // Chuyển buffer thành Base64 string để an toàn khi nhúng vào JSON
        const base64Content = fileBuffer.toString('base64');

        // Trả về JSON chứa cả metadata và nội dung file
        return NextResponse.json({
          title: metadata.title,
          description: metadata.description,
          fileName: fileName,
          contentType: "application/json", 
          content: base64Content // Sử dụng Base64
        });
      }

      // --- CÁC FILE KHÁC (ẢNH, JSON THƯỜNG) ---
      // Giữ nguyên logic cũ: trả về file trực tiếp
      const mimeType = mime.lookup(filePath) || "application/octet-stream";
      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          "Content-Type": mimeType,
          "Content-Length": fileBuffer.length.toString(),
        },
      });

    } else {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }
  } catch (error) {
    console.error("Failed to read file:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
