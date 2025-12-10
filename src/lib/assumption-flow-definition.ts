import { OnboardingPlanState } from "@/components/onboarding/types";

export const assumptionStepOrder = [
  {
    key: "pctSalaryGrowth",
    type: "QUESTION",
    payload: {
      key: "pctSalaryGrowth",
      type: "slider",
      chartDataKey: "pctSalaryGrowth",
      name: "Tiền lương",
      title: "Tốc độ tăng lương",
      label: "Tốc độ tăng lương hàng năm của bạn là bao nhiêu? (đơn vị: %)",
      explanations: [
        {
          sub: "Tại sao cần tăng lương ít nhất 7%/năm?",
          main: "Tiền lương có thể coi là đòn bẩy lớn nhất, và để nhanh chóng mua được nhà, bạn sẽ cần nỗ lực tăng lương. Mức tăng lương trung bình ở Việt Nam là 7%.",
        },
      ],
      min: 0,
      defaultValue: 7,
      max: 20,
      step: 1,
      suffix: "%",
    },
  },
  {
    key: "pctHouseGrowth",
    type: "QUESTION",
    payload: {
      key: "pctHouseGrowth",
      type: "slider",
      chartDataKey: "pctHouseGrowth",
      name: "Giá nhà",
      title: "Tốc độ tăng giá nhà",
      label: "Tốc độ tăng giá nhà là 10%/năm (dựa trên dữ liệu thị trường). Bạn có thể điều chỉnh theo khu vực của bạn nếu muốn.",
      explanations: [
        {
          sub: "Tại sao giá nhà lại tăng 10%/năm? (đơn vị: %)",
          main: "Nhu cầu nhà ở cao, tốc độ đô thị hóa nhanh, chi phí xây dựng tăng và dòng tiền đầu tư liên tục đổ vào bất động sản. Ngoài ra, đây cũng là mức tăng giá ổn định hằng năm, nhất là tại TP.HCM và Hà Nội – nơi quỹ đất khan hiếm và hạ tầng liên tục mở rộng.",
        },
      ],
      min: 0,
      defaultValue: 10,
      max: 20,
      step: 1,
      suffix: "%",
    },
  },
  {
    key: "riskProfile",
    type: "QUESTION",
    payload: {
      key: "riskProfile",
      type: "radio",
      chartDataKey: "pctInvestmentReturn",
      name: "Tích lũy của bạn",
      title: "Chọn mô tả đúng nhất về bạn:",
      label: "Chọn mô tả đúng nhất về bạn:",
      explanations: [
        {
          sub: "Thay vì để khoản tiết kiệm và khoản tiền dư ra hàng hàng tháng \"đứng yên\", chúng tôi sẽ giúp bạn xây dựng kế hoạch để nó tăng trưởng",
          main: "",
        },
      ],
      options: [
        {
          value: "safety",
          title: "Ưu tiên sự an toàn, không muốn mất vốn",
          sub: "Đề xuất định hướng: ",
          targetReturn: "4% - 6%/năm",
          description: "Gửi tiết kiệm, tích luỹ an toàn,...",
          minReturn: 4,
          maxReturn: 6,
          returnRate: 5
        },
        {
          value: "balanced",
          title: "Chấp nhận biến động để có tăng trưởng tốt hơn",
          sub: "Đề xuất định hướng: ",
          targetReturn: "6% - 10%/năm",
          description: "Tích luỹ an toàn, đầu tư tăng trưởng",
          minReturn: 6,
          maxReturn: 10,
          returnRate: 8
        },
        {
          value: "growth",
          title: "Chấp nhận rủi ro cao để tối đa hoá tăng trưởng",
          sub: "Sản phẩm tài chính đề xuất: ",
          targetReturn: "10% - 14%/năm",
          description: "Đầu tư tăng trưởng thông qua các sản phẩm uỷ thác.",
          minReturn: 10,
          maxReturn: 14,
          returnRate: 12
        },
        {
          value: "expert",
          title: "Cần sự tư vấn trực tiếp của chuyên gia",
          sub: "Sản phẩm tài chính đề xuất: ",
          targetReturn: "14% - 20%/năm",
          description: "Đầu tư tăng trưởng thông với sự đồng hành của chuyên gia từ Finful.",
          minReturn: 14,
          maxReturn: 20,
          returnRate: 17
        }
      ]
    },
  },
  {
    key: "pctInvestmentReturn",
    type: "QUESTION",
    payload: (answers: Partial<OnboardingPlanState>) => {
      // Only show this slider if the user didn't select 'expert' in the previous step
      // However, the logic in Assumption.tsx is a bit complex:
      // If expert is selected, it opens a modal. If not, it sets the value.
      // For the API flow, we might want to always show the slider but pre-fill it based on the risk profile?
      // Or maybe we just show it as a custom step.
      // Let's follow the logic: The slider is always part of the assumptionItems array in Assumption.tsx.
      // So we should include it here.

      const riskColors = {
        safety: '#22c55e',   // green-500
        balanced: '#3b82f6', // blue-500
        growth: '#f97316',   // orange-500
        expert: '#ef4444',   // red-500
      };

      const sliderColorRanges = [
        { min: 4, max: 6, color: riskColors.safety, isLast: false },
        { min: 6, max: 10, color: riskColors.balanced, isLast: false },
        { min: 10, max: 14, color: riskColors.growth, isLast: false },
        { min: 14, max: 20, color: riskColors.expert, isLast: true }
      ];

      return {
        key: "pctInvestmentReturn",
        type: "slider",
        chartDataKey: "pctInvestmentReturn",
        name: "Tích lũy của bạn",
        title: "Tỷ suất tích lũy",
        label: "Cụ thể mục tiêu tăng trưởng tài sản của bạn mỗi năm là bao nhiêu? (đơn vị: %)",
        explanations: [],
        min: 4,
        max: 20,
        step: 0.5,
        suffix: "%",
        isCustom: true,
        colorRanges: sliderColorRanges,
      };
    }
  },
];
