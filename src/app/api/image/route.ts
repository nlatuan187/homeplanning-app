import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { Readable } from "stream";
import mime from "mime-types";
import AdmZip from "adm-zip";

/**
 * @swagger
 * /api/image:
 *   get:
 *     summary: Get image file
 *     parameters:
 *       - name: url
 *         in: query
 *         required: true
 *         description: URL of the image file
 *     responses:
 *       200:
 *         description: Image file
 *       400:
 *         description: Image URL is required
 *       403:
 *         description: Forbidden
 *       404:
 *         description: File not found
 *       500:
 *         description: Internal Server Error
 */
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
        try {
          // 1. Đọc file dưới dạng buffer (bất đồng bộ)
          const fileBuffer = await fs.promises.readFile(filePath);

          // 2. Dùng AdmZip để giải nén buffer
          const zip = new AdmZip(fileBuffer);
          const zipEntries = zip.getEntries();

          // 3. Tìm file JSON chứa dữ liệu animation
          let animationEntry = zipEntries.find(entry =>
            entry.entryName.endsWith(".json") && !entry.entryName.toLowerCase().includes("manifest")
          );

          if (!animationEntry) {
            animationEntry = zipEntries.find(entry => entry.entryName.endsWith(".json"));
          }

          if (animationEntry) {
            const fileContent = animationEntry.getData().toString("utf8");
            const jsonData = JSON.parse(fileContent);
            return NextResponse.json(jsonData, {
              headers: {
                "Cache-Control": "public, max-age=31536000, immutable",
              },
            });
          } else {
            throw new Error("Không tìm thấy file JSON trong gói .lottie");
          }
        } catch (jsonError) {
          console.error("Lỗi xử lý file .lottie:", fileName, jsonError);
          return NextResponse.json({ error: "Không thể trích xuất dữ liệu JSON từ file .lottie." }, { status: 500 });
        }
      }

      // --- XỬ LÝ MẶC ĐỊNH CHO CÁC FILE KHÁC (ảnh, v.v.) ---
      // Sử dụng stream để giảm tải bộ nhớ
      const stats = await fs.promises.stat(filePath);
      const mimeType = mime.lookup(filePath) || "application/octet-stream";

      const stream = fs.createReadStream(filePath);
      // @ts-ignore: Readable.toWeb is available in Node environment for Next.js
      const webStream = Readable.toWeb(stream);

      return new Response(webStream as any, {
        status: 200,
        headers: {
          "Content-Type": mimeType,
          "Content-Length": stats.size.toString(),
          "Content-Disposition": `inline; filename="${fileName}"`,
          "Cache-Control": "public, max-age=31536000, immutable",
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