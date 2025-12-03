import { NextRequest, NextResponse } from "next/server";

// Định nghĩa kiểu dữ liệu cho Content
type EducationContent = {
  title?: string;
  message: string;
  fileName: string;
  type: "CHUNGCU" | "NHADAT"; // Chuẩn hóa type
  location: "HCM" | "HN";     // Chuẩn hóa location
  order: number;
};

// Dữ liệu cứng (được chuyển thể từ yêu cầu và file motion-flow.ts)
const EDUCATION_DATA: EducationContent[] = [
  // --- CHUNG CƯ HCM ---
  {
    order: 1,
    type: "CHUNGCU",
    location: "HCM",
    fileName: "Market chung cư HCM_Scene 2.lottie",
    title: "Bức tranh toàn cảnh",
    message: "Chung cư TP.HCM là một kênh giữ giá trị tốt với mức tăng trưởng tổng thể 35% đến 50% trong 5 năm, chủ yếu là do sự khan hiếm nguồn cung sơ cấp."
  },
  {
    order: 2,
    type: "CHUNGCU",
    location: "HCM",
    fileName: "Market chung cư HCM_Scene 3.lottie",
    message: "So với Hà Nội, đà tăng giá chung cư tại TP. Hồ Chí Minh có phần chậm hơn do mặt bằng giá ban đầu đã ở mức cao."
  },
  {
    order: 3,
    type: "CHUNGCU",
    location: "HCM",
    fileName: "Market chung cư HCM_Scene 4.lottie",
    title: "Động lực chính",
    message: "Yếu tố quyết định đến giá trị chung cư tại TP.HCM là sự khan hiếm nguồn cung các dự án mới. Khi nguồn cung sơ cấp hạn chế, nhu cầu sẽ dồn về thị trường thứ cấp (mua đi bán lại), từ đó giúp các dự án hiện hữu duy trì và gia tăng giá trị."
  },
  {
    order: 4,
    type: "CHUNGCU",
    location: "HCM",
    fileName: "Market chung cư HCM_Scene 5.lottie",
    title: "Ý nghĩa với bạn (người mua nhà)",
    message: "Lựa chọn chung cư tại TP.HCM là một quyết định đầu tư vào giá trị thực và sự khan hiếm. Sự ổn định của phân khúc này giúp bạn dễ dàng lập kế hoạch tài chính hơn."
  },
  {
    order: 5,
    type: "CHUNGCU",
    location: "HCM",
    fileName: "Market chung cư HCM_Scene 6.lottie",
    message: "Việc giá trị tài sản được bảo chứng bởi các yếu tố nền tảng (nguồn cung, nhu cầu ở thực) sẽ giúp bạn tự tin hơn rằng ngôi nhà của mình là một tài sản bền vững theo thời gian."
  },

  // --- CHUNG CƯ HÀ NỘI ---
  {
    order: 1,
    type: "CHUNGCU",
    location: "HN",
    fileName: "Market chung cư HN_Scene 2.lottie",
    title: "Bức tranh toàn cảnh",
    message: "Trong 5 năm qua, chung cư Hà Nội đã chứng tỏ là một tài sản tăng trưởng rất bền bỉ, với mức tăng tổng thể từ 70% đến 90%."
  },
  {
    order: 2,
    type: "CHUNGCU",
    location: "HN",
    fileName: "Market chung cư HN_Scene 3.lottie",
    message: "Điều đáng nói là sự tăng trưởng này diễn ra một cách ổn định, không trải qua những cú sốc giảm giá sâu như các phân khúc khác."
  },
  {
    order: 3,
    type: "CHUNGCU",
    location: "HN",
    fileName: "Market chung cư HN_Scene 4.lottie",
    title: "Động lực chính",
    message: "Sức mạnh của phân khúc này đến từ nhu cầu ở thực. Ngay cả trong giai đoạn thị trường khó khăn nhất (2022-2023), giá chung cư vẫn được neo giữ vững chắc vì người mua để ở, họ không dễ dàng bán cắt lỗ."
  },
  {
    order: 4,
    type: "CHUNGCU",
    location: "HN",
    fileName: "Market chung cư HN_Scene 5.lottie",
    message: "Khi thị trường phục hồi, sự khan hiếm nguồn cung mới càng đẩy giá trị của các dự án hiện hữu tăng lên."
  },
  {
    order: 5,
    type: "CHUNGCU",
    location: "HN",
    fileName: "Market chung cư HN_Scene 6.lottie",
    title: "Ý nghĩa với bạn (người mua nhà)",
    message: "Việc lựa chọn chung cư mang lại một nền tảng vững chắc cho kế hoạch của bạn. Sự ổn định về giá giúp bạn an tâm tập trung vào việc tích lũy mà không phải quá lo lắng về những biến động ngắn hạn của thị trường."
  },

  // --- ĐẤT NỀN (NHÀ ĐẤT) HCM ---
  // Lưu ý: Cần map "NHADAT" hoặc "NHADAT" thống nhất với Frontend gửi lên
  {
    order: 1,
    type: "NHADAT",
    location: "HCM",
    fileName: "Market đất HCM_Scene 2.lottie",
    title: "Bức tranh toàn cảnh",
    message: "Phân khúc nhà đất tại TP.HCM cũng trải qua một chu kỳ biến động mạnh, với mức tăng trưởng tổng thể 5 năm khoảng 30% đến 40%."
  },
  {
    order: 2,
    type: "NHADAT",
    location: "HCM",
    fileName: "Market đất HCM_Scene 3.lottie",
    message: "Một đặc điểm quan trọng là sự liên kết chặt chẽ với các thị trường vệ tinh như Bình Dương, Đồng Nai."
  },
  {
    order: 3,
    type: "NHADAT",
    location: "HCM",
    fileName: "Market đất HCM_Scene 4.lottie",
    title: "Động lực chính",
    message: "Các cơn sốt đất nền vùng ven (2020-2022) được thúc đẩy bởi dòng tiền đầu cơ và các thông tin quy hoạch hạ tầng."
  },
  {
    order: 4,
    type: "NHADAT",
    location: "HCM",
    fileName: "Market đất HCM_Scene 5.lottie",
    message: "Khi thị trường trầm lắng (2022-2023), phân khúc này đã điều chỉnh đáng kể và đang trong giai đoạn phục hồi chậm."
  },
  {
    order: 5,
    type: "NHADAT",
    location: "HCM",
    fileName: "Market đất HCM_Scene 6.lottie",
    title: "Ý nghĩa với bạn (người mua nhà)",
    message: "Việc mua nhà đất là một cam kết lâu dài với giá trị cốt lõi nằm ở quyền sở hữu đất. Kế hoạch của bạn cần tính đến các yếu tố chu kỳ và không nên kỳ vọng vào việc tăng giá nhanh chóng trong ngắn hạn."
  },
  {
    order: 6,
    type: "NHADAT",
    location: "HCM",
    fileName: "Market đất HCM_Scene 7.lottie",
    message: 'Hãy tập trung vào các khu vực có tiềm năng phát triển hạ tầng thực sự và xác định đây là một tài sản để "an cư" và tích lũy giá trị trong dài hạn, thay vì kỳ vọng lợi nhuận nhanh chóng.'
  },

  // --- ĐẤT NỀN (NHÀ ĐẤT) HÀ NỘI ---
  {
    order: 1,
    type: "NHADAT",
    location: "HN",
    fileName: "Market đất HN_Scene 2.lottie",
    title: "Bức tranh toàn cảnh",
    message: "Phân khúc nhà đất Hà Nội tăng giá rất ổn định, không có những cú sốt giá lớn hay giảm giá sâu. Trong 5 năm qua, giá đã tăng khoảng 50% đến 60%. Giá trị tăng trưởng đều đặn qua từng năm."
  },
  {
    order: 2,
    type: "NHADAT",
    location: "HN",
    fileName: "Market đất HN_Scene 3.lottie",
    title: "Động lực chính",
    message: "Sức mạnh của phân khúc này đến từ niềm tin của người dân. Người Hà Nội luôn coi nhà đất là một tài sản an toàn để cất giữ tiền."
  },
  {
    order: 3,
    type: "NHADAT",
    location: "HN",
    fileName: "Market đất HN_Scene 4.lottie",
    message: "Nhu cầu mua để ở và để dành luôn ở mức cao. Điều này giúp giá nhà đất tại Hà Nội tăng trưởng bền vững."
  },
  {
    order: 4,
    type: "NHADAT",
    location: "HN",
    fileName: "Market đất HN_Scene 5.lottie",
    title: "Ý nghĩa với bạn (người mua nhà)",
    message: "Lựa chọn nhà đất đòi hỏi một tầm nhìn dài hạn và sự kiên nhẫn. Tiềm năng của nó nằm ở giá trị đất đai lâu dài và sự tự do trong việc xây dựng tổ ấm."
  },
  {
    order: 5,
    type: "NHADAT",
    location: "HN",
    fileName: "Market đất HN_Scene 6.lottie",
    message: "Tuy nhiên, bạn cần chuẩn bị tâm lý cho những biến động của chu kỳ và không nên kỳ vọng vào việc tăng giá nhanh chóng trong ngắn hạn. Hãy tập trung vào giá trị sử dụng và khả năng tài chính của mình thay vì chạy theo các cơn sốt."
  }
];

/**
 * @swagger
 * /api/education:
 *   get:
 *     summary: Lấy dữ liệu giáo dục
 *     description: >
 *       API này dùng để lấy dữ liệu giáo dục từ file JSON.
 *     tags:
 *       - Education
 *     parameters:
 *       - in: query
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *         description: Loại dữ liệu (CHUNGCU, NHADAT)
 *       - in: query
 *         name: location
 *         required: true
 *         schema:
 *           type: string
 *         description: Vị trí (HCM, HN)
 *     responses:
 *       '200':
 *         description: Trả về dữ liệu giáo dục.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   title:
 *                     type: string
 *                   message:
 *                     type: string
 *                   url:
 *                     type: string
 *                   order:
 *                     type: integer
 *       '400':
 *         description: Bad Request. Thiếu tham số 'type' hoặc 'location'.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Missing parameters. 'type' and 'location' are required.
 *       '500':
 *         description: Internal Server Error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  
  // Lấy tham số và chuẩn hóa về chữ in hoa để so sánh
  const type = searchParams.get("type")?.toUpperCase();
  const location = searchParams.get("location")?.toUpperCase();

  // Validate tham số
  if (!type || !location) {
    return NextResponse.json({ 
      error: "Missing parameters. 'type' and 'location' are required." 
    }, { status: 400 });
  }

  // Base URL cho hình ảnh/lottie
  // Lưu ý: Dùng biến môi trường hoặc hardcode domain hiện tại
  // Trong môi trường server component/API, req.url có thể dùng để lấy host
  const protocol = req.nextUrl.protocol;
  const host = req.nextUrl.host;
  const baseUrl = `${protocol}//${host}`;

  // Lọc dữ liệu
  const filteredData = EDUCATION_DATA.filter(item => {
    // So sánh linh hoạt một chút (ví dụ client gửi 'chung-cu' thì vẫn match 'CHUNGCU' nếu cần xử lý thêm)
    // Ở đây giả định client gửi đúng 'CHUNGCU', 'NHADAT', 'HN', 'HCM'
    // Map NHADAT nếu client gửi NHADAT
    const normalizedType = (type === "NHADAT" || type === "NHA DAT") ? "NHADAT" : type;
    
    return item.type === normalizedType && item.location === location;
  });

  // Sắp xếp theo order
  filteredData.sort((a, b) => a.order - b.order);

  // Map sang format response mong muốn
  const response = filteredData.map(item => ({
    title: item.title, // Optional
    message: item.message, // Required (mapped from description/message)
    url: `${baseUrl}/api/image?url=motion/${encodeURIComponent(item.fileName)}`, // Tạo URL đầy đủ
    order: item.order
  }));

  return NextResponse.json(response);
}
