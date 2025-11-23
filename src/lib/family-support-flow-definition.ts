/**
 * @file This file defines the entire step-by-step flow for the "familySupport" section,
 * including conditional questions and educational content.
 */

// A helper object containing the payload for each individual step.
const stepPayloads = {
  monthlyOtherIncome: (answers: Record<string, any>) => ({
    key: "monthlyOtherIncome",
    text: answers.hasCoApplicant
      ? "Tổng thu nhập khác (ngoài lương) của bạn và người đồng hành tài chính mỗi tháng là bao nhiêu? (đơn vị: triệu VNĐ)"
      : "Tổng thu nhập khác (ngoài lương) của bạn mỗi tháng là bao nhiêu? (đơn vị: triệu VNĐ)",
    type: "number",
    unit: "triệu VNĐ",
  }),

  familyAnalysis: {
    title: "Hỗ trợ từ người thân không nhất thiết phải là một khoản cho không!",
    image: "/onboarding/familyanalys.png",
    text: "Bằng cách định lượng rõ tiềm năng lợi nhuận và rủi ro của cơ hội mua nhà, bạn có thể mời họ 'cùng đầu tư' và chia sẻ lợi nhuận. Đây là một cách huy động vốn rất thông minh.",
    ctaText: "Tiếp tục",
  },

  hasFamilySupport: {
    key: "hasFamilySupport",
    text: "Bạn có nhận được hỗ trợ tài chính từ gia đình (bố mẹ, họ hàng,...) không?",
    type: "options",
    // Note: The value is boolean, matching the frontend component logic.
    options: [
      { label: "Có", value: true },
      { label: "Không", value: false },
    ],
  },

  familySupportType: {
    key: "familySupportType",
    text: "Đây là khoản cho TẶNG hay cho VAY?",
    type: "options",
    options: [
      { label: "Cho tặng (không cần hoàn lại)", value: "GIFT" },
      { label: "Cho vay (cần hoàn lại)", value: "LOAN" },
    ],
  },

  familySupportGiftAmount: {
    key: "familySupportGiftAmount",
    text: "Số tiền được tặng (đơn vị: triệu VNĐ)",
    type: "number",
    unit: "triệu VNĐ",
  },

  familySupportGiftTiming: {
    key: "familySupportGiftTiming",
    text: "Khi nào bạn sẽ nhận được số tiền này?",
    type: "options",
    options: [
      { label: "Ngay bây giờ (có thể mang đi đầu tư để tích luỹ)", value: "NOW" },
      { label: "Khi thanh toán mua nhà", value: "AT_PURCHASE" },
    ],
  },

  familySupportLoanAmount: {
    key: "familySupportLoanAmount",
    text: "Số tiền đi vay (đơn vị: triệu VNĐ)",
    type: "number",
    unit: "triệu VNĐ",
  },

  familySupportLoanInterest: {
    key: "familySupportLoanInterest",
    text: "Lãi suất cho vay (đơn vị: %/năm) (Nếu vay không cần trả lãi, vui lòng nhập 0)",
    type: "number",
    unit: "%",
  },

  familySupportLoanRepayment: {
    key: "familySupportLoanRepayment",
    text: "Bạn sẽ trả nợ theo hình thức nào?",
    type: "options",
    options: [
      { label: "Trả góp đều hàng tháng", value: "MONTHLY" },
      { label: "Trả một lần khi đủ tiền", value: "LUMP_SUM" },
    ],
  },

  familySupportLoanTerm: {
    key: "familySupportLoanTerm",
    text: "Thời hạn của khoản vay này là bao lâu (năm)",
    type: "number",
    unit: "năm",
  },
};

// This array defines the exact order and logic of the steps.
export const familySupportStepOrder = [
  { id: 'monthlyOtherIncome', type: 'QUESTION', payload: stepPayloads.monthlyOtherIncome },
  { id: 'familyAnalysis', type: 'EDUCATION', payload: stepPayloads.familyAnalysis },
  { id: 'hasFamilySupport', type: 'QUESTION', payload: stepPayloads.hasFamilySupport },
  {
    id: 'familySupportType',
    type: 'QUESTION',
    payload: (ans: any) => ans.hasFamilySupport ? stepPayloads.familySupportType : null,
  },
  {
    id: 'familySupportGiftAmount',
    type: 'QUESTION',
    payload: (ans: any) => ans.hasFamilySupport && ans.familySupportType === 'GIFT' ? stepPayloads.familySupportGiftAmount : null,
  },
  {
    id: 'familySupportGiftTiming',
    type: 'QUESTION',
    payload: (ans: any) => ans.hasFamilySupport && ans.familySupportType === 'GIFT' ? stepPayloads.familySupportGiftTiming : null,
  },
  {
    id: 'familySupportLoanAmount',
    type: 'QUESTION',
    payload: (ans: any) => ans.hasFamilySupport && ans.familySupportType === 'LOAN' ? stepPayloads.familySupportLoanAmount : null,
  },
  {
    id: 'familySupportLoanInterest',
    type: 'QUESTION',
    payload: (ans: any) => ans.hasFamilySupport && ans.familySupportType === 'LOAN' ? stepPayloads.familySupportLoanInterest : null,
  },
  {
    id: 'familySupportLoanRepayment',
    type: 'QUESTION',
    payload: (ans: any) => ans.hasFamilySupport && ans.familySupportType === 'LOAN' ? stepPayloads.familySupportLoanRepayment : null,
  },
  {
    id: 'familySupportLoanTerm',
    type: 'QUESTION',
    payload: (ans: any) => ans.hasFamilySupport && ans.familySupportType === 'LOAN' && ans.familySupportLoanRepayment === 'MONTHLY' ? stepPayloads.familySupportLoanTerm : null,
  },
];
