/**
 * @file This file defines the entire step-by-step flow for the "quickCheck" section.
 * It acts as the "brain" or "map" for the onboarding process,
 * determining the order of questions and educational content.
 */

// A helper object containing content for the market analysis (education) step.
const analysisContent = {
  HANOI: {
    CHUNG_CU: {
      title: "Phân tích Thị trường Chung cư tại Hà Nội",
      summary: "Lựa chọn của bạn đang tập trung vào sự an toàn và tăng trưởng ổn định.",
      image: "/onboarding/hanoi-chungcu.png",
      points: null,
      ctaText: "Tôi đã hiểu, tiếp tục",
    },
    NHA_DAT: {
      title: "Phân tích Thị trường Nhà đất tại Hà Nội",
      summary: "Bạn đang hướng tới một tài sản có tiềm năng tăng trưởng đột phá và giá trị lâu dài.",
      image: "/onboarding/hanoi-nhadat.png",
      points: null,
      ctaText: "Tôi đã hiểu, tiếp tục",
    },
  },
  HCMC: {
    CHUNG_CU: {
      title: "Phân tích Thị trường Chung cư tại TP.HCM",
      summary: "Bạn đang chọn một giải pháp nhà ở hiện đại, linh hoạt và phù hợp với nhịp sống năng động.",
      image: "/onboarding/hcmc-chungcu.png",
      points: null,
      ctaText: "Tôi đã hiểu, tiếp tục",
    },
    NHA_DAT: {
      title: "Phân tích Thị trường Nhà đất tại TP.HCM",
      summary: "Lựa chọn của bạn thể hiện tầm nhìn đầu tư dài hạn vào một trong những thị trường bất động sản giá trị nhất cả nước.",
      image: "/onboarding/hcmc-nhadat.png",
      points: null,
      ctaText: "Tôi đã hiểu, tiếp tục",
    }
  }
};


const currentYear = new Date().getFullYear();

// Defines the payload for each individual step.
const stepPayloads = {
  yearsToPurchase: {
    key: "yearsToPurchase",
    text: "Bạn dự định mua nhà vào thời điểm nào?",
    type: "options",
    options: [
      { label: `Bây giờ (${currentYear})`, value: currentYear },
      { label: `1 năm nữa (${currentYear + 1})`, value: currentYear + 1 },
      { label: `2 năm nữa (${currentYear + 2})`, value: currentYear + 2 },
      { label: `3 năm nữa (${currentYear + 3})`, value: currentYear + 3 },
    ],
  },
  targetHousePriceN0: {
    key: "targetHousePriceN0",
    text: "Ngôi nhà mơ ước của bạn hiện tại đang có giá bao nhiêu? (đơn vị: tỷ VNĐ)",
    type: "number",
    unit: "Tỷ VNĐ",
  },
  targetHouseType: {
    key: "targetHouseType",
    text: "Căn nhà đó là loại nhà gì?",
    type: "options",
    options: [
      { value: "CHUNG_CU", label: "Chung cư" },
      { value: "NHA_DAT", label: "Nhà mặt đất" },
      { value: "KHAC", label: "Khác" },
    ],
  },
  targetLocation: {
    key: "targetLocation",
    text: "Bạn dự định sẽ mua nhà ở tỉnh/thành phố nào?",
    type: "options",
    options: [
      { value: "HANOI", label: "Hà Nội" },
      { value: "HCMC", label: "TP. Hồ Chí Minh" },
      { value: "KHAC", label: "Tỉnh/Thành phố khác" },
    ],
  },
  marketAnalysis: (answers: Record<string, any>) => {
    // Dynamically returns the correct market analysis content based on location and house type.
    // Returns null if no matching content is found (e.g., for 'KHAC'), allowing the API to skip this step.
    const location = answers.targetLocation as keyof typeof analysisContent;
    const houseType = answers.targetHouseType as keyof typeof analysisContent[keyof typeof analysisContent];
    return analysisContent[location]?.[houseType] || null;
  },
  hasCoApplicant: {
    key: "hasCoApplicant",
    text: "Bạn có người đồng hành tài chính (vợ/chồng/anh chị em) khi mua nhà không?",
    type: "options",
    options: [
      { value: true, label: "Có" },
      { value: false, label: "Không" },
    ],
  },
  initialSavings: (answers: Record<string, any>) => ({
    key: "initialSavings",
    text: answers.hasCoApplicant
      ? "Các bạn đã tích lũy được bao nhiêu tiền để mua nhà rồi? (đơn vị: triệu VNĐ)"
      : "Bạn đã tích lũy được bao nhiêu tiền để mua nhà rồi? (đơn vị: triệu VNĐ)",
    type: "number",
    unit: "triệu VNĐ",
  }),
  userMonthlyIncome: (answers: Record<string, any>) => ({
    key: "userMonthlyIncome",
    text: answers.hasCoApplicant
      ? "TỔNG thu nhập hàng tháng của các bạn là bao nhiêu? (đön vị: triệu VNĐ)"
      : "Lương hàng tháng của bạn là bao nhiêu? (đơn vị: triệu VNĐ)",
    type: "number",
    unit: "triệu VNĐ",
  }),
  monthlyLivingExpenses: (answers: Record<string, any>) => ({
    key: "monthlyLivingExpenses",
    text: answers.hasCoApplicant
      ? "TỔNG chi phí sinh hoạt hàng tháng của các bạn là bao nhiêu? (đơn vị: triệu VNĐ)"
      : "Chi phí sinh hoạt hàng tháng của bạn là bao nhiêu? (đơn vị: triệu VNĐ)",
    type: "number",
    unit: "triệu VNĐ",
  }),
};

// This array defines the exact order and logic of the steps.
export const quickCheckStepOrder = [
  { id: 'yearsToPurchase', type: 'QUESTION', payload: stepPayloads.yearsToPurchase },
  { id: 'targetHousePriceN0', type: 'QUESTION', payload: stepPayloads.targetHousePriceN0 },
  { id: 'targetHouseType', type: 'QUESTION', payload: stepPayloads.targetHouseType },
  { id: 'targetLocation', type: 'QUESTION', payload: stepPayloads.targetLocation },
  { id: 'marketAnalysis', type: 'EDUCATION', payload: stepPayloads.marketAnalysis },
  { id: 'hasCoApplicant', type: 'QUESTION', payload: stepPayloads.hasCoApplicant },
  { id: 'initialSavings', type: 'QUESTION', payload: stepPayloads.initialSavings },
  { id: 'userMonthlyIncome', type: 'QUESTION', payload: stepPayloads.userMonthlyIncome },
  { id: 'monthlyLivingExpenses', type: 'QUESTION', payload: stepPayloads.monthlyLivingExpenses },
];
