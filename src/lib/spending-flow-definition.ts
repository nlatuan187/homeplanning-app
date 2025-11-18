/**
 * @file This file defines the entire step-by-step flow for the "spending" section,
 * including conditional questions and educational content.
 */

const currentYear = new Date().getFullYear();

// A helper object containing the payload for each individual step.
const stepPayloads = {
  monthlyNonHousingDebt: {
    key: 'monthlyNonHousingDebt',
    text: 'Số tiền bạn đang trả cho các khoản vay hàng tháng khác? (nợ, tín dụng,...) (đơn vị: triệu VNĐ)',
    type: 'number',
    unit: 'triệu VNĐ',
  },
  currentAnnualInsurancePremium: {
    key: 'currentAnnualInsurancePremium',
    text: 'Chi phí bạn đang trả cho bảo hiểm nhân thọ hàng năm là bao nhiêu? (BHXH, BHYT, ...) (đơn vị: triệu VNĐ)',
    type: 'number',
    unit: 'triệu VNĐ',
    description: "* Nếu bạn đã đóng bảo hiểm xã hội ở nơi làm việc, chỉ cần nhập giá trị bảo hiểm nhân thọ ở đây."
  },
  childPlanningAnalysis: {
    title: "Một trong những lý do phổ biến nhất khiến việc mua nhà chậm lại là có em bé ngoài dự kiến",
    image: "/onboarding/analysis.png",
    text: "Hãy cân nhắc thật kỹ về thời điểm sinh em bé để đảm bảo bạn vững vàng nhất về tài chính cũng như kế hoạch mua nhà không bị thay đổi đột ngột ngoài dự kiến.",
    ctaText: "Tiếp tục",
  },
  hasNewChild: {
    key: 'hasNewChild',
    text: 'Bạn có dự định sinh thêm em bé không?',
    type: 'options',
    options: [
      { label: 'Có', value: true },
      { label: 'Không', value: false }
    ],
  },
  yearToHaveChild: {
    key: "yearToHaveChild",
    text: "Bạn dự định sinh em bé vào năm nào?",
    type: "options",
    options: [
      { label: `Năm nay (${currentYear})`, value: currentYear },
      { label: `1 năm nữa (${currentYear + 1})`, value: currentYear + 1 },
      { label: `2 năm nữa (${currentYear + 2})`, value: currentYear + 2 },
    ],
  },
  monthlyChildExpenses: {
    key: "monthlyChildExpenses",
    text: "Chi phí phát sinh hàng tháng khi có thêm em bé (đơn vị: triệu VNĐ)",
    description: "* Theo nghiên cứu của Finful, chi phí phát sinh khi có em bé ước tính bằng 25% tổng chi phí của gia đình. Chúng tôi đã tự động tính toán dựa trên chi phí của gia đình bạn. Bạn có thể điều chỉnh nếu có con số phù hợp hơn.",
    type: "number",
    unit: "triệu VNĐ",
  }
};

// This array defines the exact order and logic of the steps.
export const spendingStepOrder = [
  { id: 'monthlyNonHousingDebt', type: 'QUESTION', payload: stepPayloads.monthlyNonHousingDebt },
  { id: 'currentAnnualInsurancePremium', type: 'QUESTION', payload: stepPayloads.currentAnnualInsurancePremium },
  { id: 'childPlanningAnalysis', type: 'EDUCATION', payload: (ans: any) => ans.hasCoApplicant ? stepPayloads.childPlanningAnalysis : null, },
  {
    id: 'hasNewChild',
    type: 'QUESTION',
    // This question only appears if the user has a co-applicant.
    payload: (ans: any) => ans.hasCoApplicant ? stepPayloads.hasNewChild : null,
  },
  {
    id: 'yearToHaveChild',
    type: 'QUESTION',
    payload: (ans: any) => ans.hasNewChild ? stepPayloads.yearToHaveChild : null,
  },
  {
    id: 'monthlyChildExpenses',
    type: 'QUESTION',
    payload: (ans: any) => ans.hasNewChild ? stepPayloads.monthlyChildExpenses : null,
  },
];
