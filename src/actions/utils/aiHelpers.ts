import { GoogleGenerativeAI } from "@google/generative-ai";
import { safeJsonParse, formatJsonToMarkdown } from "./formatters";

// Initialize the Google Generative AI client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Models for different purposes
export const proModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-04-17" });
export const flashModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-04-17" });

// Default generation config
export const defaultGenerationConfig = {
  temperature: 0.5,
  maxOutputTokens: 5000
};

/**
 * Generate content using the Gemini API
 */
export async function generateContent(
  prompt: string,
  model = proModel,
  config = defaultGenerationConfig
): Promise<string> {
  try {
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: config
    });

    return result.response.text();
  } catch (error) {
    console.error("Error generating content:", error);
    throw error;
  }
}

/**
 * Generate structured content and parse as JSON
 */
export async function generateStructuredContent(
  prompt: string,
  model = proModel,
  config = defaultGenerationConfig
): Promise<any> {
  try {
    const text = await generateContent(prompt, model, config);
    return safeJsonParse(text);
  } catch (error) {
    console.error("Error generating structured content:", error);
    return {
      currentSituation: "Không thể tạo nội dung có cấu trúc.",
      expertExplanation: "Đã xảy ra lỗi khi gọi API Gemini.",
      recommendations: `Lỗi: ${error instanceof Error ? error.message : "Lỗi không xác định"}`
    };
  }
}

/**
 * Generate markdown content from a prompt
 */
export async function generateMarkdownContent(
  prompt: string,
  model = proModel,
  config = defaultGenerationConfig
): Promise<string> {
  try {
    const jsonData = await generateStructuredContent(prompt, model, config);
    return formatJsonToMarkdown(jsonData);
  } catch (error) {
    console.error("Error generating markdown content:", error);
    return `## Lỗi\n\nKhông thể tạo nội dung. Lỗi: ${error instanceof Error ? error.message : "Lỗi không xác định"}`;
  }
}

/**
 * Create a standard prompt template for report sections
 */
export function createSectionPrompt(
  sectionTitle: string,
  sectionDescription: string,
  userContext: any,
  confirmedYearData: any,
  loanSummary: any,
  additionalData: string = ""
): string {
  const confirmedYear = userContext.confirmedPurchaseYear;
  const buffer = confirmedYearData.buffer;
  const isAffordable = buffer >= 0;

  return `
  Bạn là Finful, một chuyên gia tư vấn tài chính người Việt Nam cung cấp phân tích chi tiết và chu đáo cho kế hoạch mua nhà lần đầu của khách hàng. Viết phần báo cáo được yêu cầu một cách toàn diện và khuyến khích bằng tiếng Việt, sử dụng định dạng markdown.

  Thông tin người dùng: Người dùng ${userContext.maritalStatus}, ${userContext.hasDependents ? "có người phụ thuộc" : "không có người phụ thuộc"}, đang lên kế hoạch mua nhà. Họ đã xem xét các dự báo và chọn năm ${confirmedYear} làm mục tiêu mua nhà.

  Chủ đề phần: ${sectionTitle}

  ${sectionDescription}

  Dữ liệu cho Năm Mua nhà Đã xác nhận ${confirmedYear}:
  * Tiết kiệm tích lũy: ${Math.round(confirmedYearData.cumulativeSavings)} triệu VNĐ
  * Giá nhà dự kiến: ${Math.round(confirmedYearData.housePriceProjected)} triệu VNĐ
  * Tỷ lệ Vay/Giá trị (LTV): ${Math.round(confirmedYearData.ltvRatio)}%
  * Tỷ lệ Vốn tự có/Giá nhà: ${Math.round(loanSummary.downPaymentPercentage)}%
  * Khoản trả góp hàng tháng: ${Math.round(confirmedYearData.monthlyPayment)} triệu VNĐ
  * Khoản chênh lệch hàng tháng: ${Math.round(confirmedYearData.buffer)} triệu VNĐ
  * Khả thi: ${isAffordable ? "Có" : "Không"}
  ${additionalData}

  ${!isAffordable ? `
  Quan trọng: Kế hoạch hiện tại KHÔNG khả thi về mặt tài chính vì khoản chênh lệch âm/thâm hụt (${Math.round(confirmedYearData.buffer)} triệu VNĐ). 
  Đưa ra các khuyến nghị cụ thể để làm cho kế hoạch khả thi, chẳng hạn như:
  - Tăng các nguồn thu nhập khác (hỗ trợ từ gia đình, công việc bên ngoài)
  - Kết hôn sớm hơn nếu chưa kết hôn
  - Hoãn sinh con nếu có thể
  - Giảm giá nhà mục tiêu
  - Tăng thu nhập và lợi nhuận đầu tư
  - Giảm chi phí hàng tháng
  - Trong trường hợp xấu nhất, cân nhắc thuê nhà trong khi cải thiện các yếu tố này
  ` : ""}

  Nhiệm vụ: Viết phần '${sectionTitle}' cho kế hoạch của họ nhắm đến năm ${confirmedYear}. Phân tích và giải thích kỹ lưỡng các khía cạnh quan trọng của phần này.

  Viết phần báo cáo này với 3 phần rõ ràng:
  1. Tình hình hiện tại
  2. Giải thích của chuyên gia
  3. Khuyến nghị của chuyên gia
  `;
}
