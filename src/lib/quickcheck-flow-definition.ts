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
      points: {
        "Bức tranh toàn cảnh": "Trong 5 năm qua, chung cư Hà Nội đã chứng tỏ là một tài sản tăng trưởng rất bền bỉ, mang lại sự an tâm cho người sở hữu.",
        "Động lực chính": "Sức mạnh của phân khúc này đến từ nhu cầu ở thực, luôn hiện hữu và gia tăng theo sự phát triển của đô thị.",
        "Ý nghĩa với bạn (người mua nhà)": "Việc lựa chọn chung cư mang lại một nền tảng vững chắc cho kế hoạch của bạn, dễ dàng tiếp cận các khoản vay và có tính thanh khoản tốt.",
      },
      ctaText: "Tôi đã hiểu, tiếp tục",
    },
    NHA_DAT: {
      title: "Phân tích Thị trường Nhà đất tại Hà Nội",
      summary: "Bạn đang hướng tới một tài sản có tiềm năng tăng trưởng đột phá và giá trị lâu dài.",
      image: "/onboarding/hanoi-nhadat.png",
      points: {
        "Bức tranh toàn cảnh": "Nhà đất Hà Nội luôn là kênh đầu tư hấp dẫn với tiềm năng tăng giá mạnh mẽ, đặc biệt ở các khu vực có quy hoạch hạ tầng tốt.",
        "Động lực chính": "Quyền sở hữu đất đai vĩnh viễn và tâm lý 'tấc đất tấc vàng' là động lực chính thúc đẩy giá trị của phân khúc này.",
        "Ý nghĩa với bạn (người mua nhà)": "Sở hữu nhà đất không chỉ là một tài sản mà còn là một di sản. Tuy nhiên, nó đòi hỏi một nguồn vốn lớn hơn và sự tìm hiểu kỹ lưỡng về pháp lý.",
      },
      ctaText: "Tôi đã hiểu, tiếp tục",
    },
  },
  HCMC: {
    CHUNG_CU: {
        title: "Phân tích Thị trường Chung cư tại TP.HCM",
        summary: "Bạn đang chọn một giải pháp nhà ở hiện đại, linh hoạt và phù hợp với nhịp sống năng động.",
        image: "/onboarding/hcmc-chungcu.png",
        points: {
            "Bức tranh toàn cảnh": "Thị trường chung cư TP.HCM cực kỳ sôi động với đa dạng phân khúc, đáp ứng mọi nhu cầu từ cơ bản đến cao cấp.",
            "Động lực chính": "Dân số trẻ và tốc độ đô thị hóa nhanh chóng là động lực tăng trưởng chính, giữ cho thị trường luôn có nhu cầu cao.",
            "Ý nghĩa với bạn (người mua nhà)": "Chung cư là lựa chọn thông minh để an cư tại một thành phố lớn, với nhiều tiện ích đi kèm và cộng đồng dân cư văn minh.",
        },
        ctaText: "Tôi đã hiểu, tiếp tục",
    },
    NHA_DAT: {
        title: "Phân tích Thị trường Nhà đất tại TP.HCM",
        summary: "Lựa chọn của bạn thể hiện tầm nhìn đầu tư dài hạn vào một trong những thị trường bất động sản giá trị nhất cả nước.",
        image: "/onboarding/hcmc-nhadat.png",
        points: {
            "Bức tranh toàn cảnh": "Giá trị nhà đất tại TP.HCM liên tục tăng trưởng nhờ vị thế trung tâm kinh tế và sự khan hiếm của quỹ đất.",
            "Động lực chính": "Dòng vốn đầu tư mạnh mẽ và nhu cầu tích lũy tài sản của người dân là những yếu tố cốt lõi thúc đẩy thị trường.",
            "Ý nghĩa với bạn (người mua nhà)": "Đây là một tài sản lớn có khả năng chống lại lạm phát và gia tăng giá trị vượt trội theo thời gian, nhưng cần sự chuẩn bị tài chính vững vàng.",
        },
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
    text: "Ngôi nhà mơ ước của bạn hiện tại đang có giá bao nhiêu? (đơn vị: triệu VNĐ)",
    type: "number",
    unit: "triệu VNĐ",
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
      { value: "CO", label: "Có" },
      { value: "KHONG", label: "Không" },
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
