"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion"; // 1. Import framer-motion
import LottieAnimation from "@/components/ui/lottieAnimation";
import HcmcChungCuAnimation2 from "../../../../public/lottie/HCMCCScene2.json";
import HcmcChungCuAnimation3 from "../../../../public/lottie/HCMCCScene3.json";
import HcmcChungCuAnimation4 from "../../../../public/lottie/HCMCCScene4.json";
import HcmcChungCuAnimation5 from "../../../../public/lottie/HCMCCScene5.json";
import HcmcChungCuAnimation6 from "../../../../public/lottie/HCMCCScene6.json";
import HnNhaDatAnimation2 from "../../../../public/lottie/HNDScene2.json";
import HnNhaDatAnimation3 from "../../../../public/lottie/HNDScene3.json";
import HnNhaDatAnimation4 from "../../../../public/lottie/HNDScene4.json";
import HnNhaDatAnimation5 from "../../../../public/lottie/HNDScene5.json";
import HnNhaDatAnimation6 from "../../../../public/lottie/HNDScene6.json";
import HnChungCuAnimation2 from "../../../../public/lottie/HNCCScene2.json";
import HnChungCuAnimation3 from "../../../../public/lottie/HNCCScene3.json";
import HnChungCuAnimation4 from "../../../../public/lottie/HNCCScene4.json";
import HnChungCuAnimation5 from "../../../../public/lottie/HNCCScene5.json";
import HnChungCuAnimation6 from "../../../../public/lottie/HNCCScene6.json";
import HcmcNhaDatAnimation2 from "../../../../public/lottie/HCMDScene2.json";
import HcmcNhaDatAnimation3 from "../../../../public/lottie/HCMDScene3.json";
import HcmcNhaDatAnimation4 from "../../../../public/lottie/HCMDScene4.json";
import HcmcNhaDatAnimation5 from "../../../../public/lottie/HCMDScene5.json";
import HcmcNhaDatAnimation6 from "../../../../public/lottie/HCMDScene6.json";
import HcmcNhaDatAnimation7 from "../../../../public/lottie/HCMDScene7.json";
import { OnboardingPlanState } from "../types";
import MultiStepQuestionForm, {
  Question,
} from "../shared/MultiStepQuestionForm";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import LoadingOverlay from "@/components/ui/loading-overlay";
import {
  calculateQuickCheckResult,
  QuickCheckResultPayload,
} from "@/actions/createPlanFromOnboarding";
import { toast } from "react-hot-toast";
import { generateProjections, PlanWithDetails, preparePlanForProjection } from "@/lib/calculations/projections/generateProjections";
import { ProjectionRow } from "@/lib/calculations/affordability";
import ResultsClient from "./ResultsClient";
import { useAuth } from "@clerk/nextjs";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";

const currentYear = new Date().getFullYear();

const quickCheckQuestionsPart1: Question[] = [
  {
    key: "yearsToPurchase",
    text: "Thời gian bạn dự định mua căn nhà mơ ước?",
    type: "options",
    options: [
      { label: `Bây giờ (${currentYear})`, value: currentYear },
      { label: `1 năm nữa (${currentYear + 1})`, value: currentYear + 1 },
      { label: `2 năm nữa (${currentYear + 2})`, value: currentYear + 2 },
      { label: `3 năm nữa (${currentYear + 3})`, value: currentYear + 3 },
    ],
  },
  {
    key: "targetHousePriceN0",
    text: "Ngôi nhà mơ ước của bạn hiện tại đang có giá bao nhiêu? (đơn vị: tỷ VNĐ)",
    type: "number",
    unit: "tỷ VNĐ",
  },
  {
    key: "targetHouseType",
    text: "Căn nhà đó là loại nhà gì?",
    type: "options",
    options: [
      { label: "Chung cư", value: "Chung cư" },
      { label: "Nhà mặt đất", value: "Nhà mặt đất" },
      { label: "Khác", value: "Khác" },
    ],
  },
  {
    key: "targetLocation",
    text: "Bạn dự định sẽ mua nhà ở tỉnh/thành phố nào?",
    type: "options",
    options: [
      { label: "Hà Nội", value: "Hà Nội" },
      { label: "TP. Hồ Chí Minh", value: "TP. Hồ Chí Minh" },
      { label: "Tỉnh/Thành phố khác", value: "Tỉnh/Thành phố khác" },
    ],
  },
];

const quickCheckQuestionsPart2: Question[] = [
  {
    key: "hasCoApplicant",
    text: "Bạn có người đồng hành tài chính (vợ/chồng/anh chị em) khi mua nhà không?",
    type: "options",
    options: [
      { label: "Có", value: true },
      { label: "Không", value: false },
    ],
  },
  {
    key: "initialSavings",
    text: (ans) =>
      ans.hasCoApplicant
        ? "Các bạn đã tích lũy được bao nhiêu tiền để mua nhà rồi? (đơn vị: triệu VNĐ)"
        : "Bạn đã tích lũy được bao nhiêu tiền để mua nhà rồi? (đơn vị: triệu VNĐ)",
    type: "number",
    unit: "triệu VNĐ",
  },
  {
    key: "userMonthlyIncome",
    text: (ans) =>
      ans.hasCoApplicant
        ? "TỔNG thu nhập hàng tháng của các bạn là bao nhiêu? (đơn vị: triệu VNĐ)"
        : "Lương hàng tháng của bạn là bao nhiêu? (đơn vị: triệu VNĐ)",
    type: "number",
    unit: "triệu VNĐ",
  },
  {
    key: "monthlyLivingExpenses",
    text: (ans) =>
      ans.hasCoApplicant
        ? "TỔNG chi phí hàng tháng của các bạn là bao nhiêu? (đơn vị: triệu VNĐ)"
        : "Chi phí hàng tháng của bạn là bao nhiêu? (đơn vị: triệu VNĐ)",
    type: "number",
    unit: "triệu VNĐ",
  },
];

const analysisContent: any = {
  "Hà Nội": {
    "Chung cư": [
      // Dữ liệu cho trang giới thiệu đầu tiên
      {
        image: "/onboarding/hanoi-chungcu.png",
        // Thay thế 'description' và 'highlight' bằng cấu trúc này
        summaryParts: [
          { text: "Lựa chọn của bạn đang tập trung vào" },
          { text: "sự an toàn", highlight: true },
          { text: " và " },
          { text: "tăng trưởng ổn định.", highlight: true },
        ],
      },
      // Các trang tiếp theo giữ nguyên
      {
        animation: HnChungCuAnimation2,
        title: "Bức tranh toàn cảnh",
        description:
          "Trong 5 năm qua, chung cư Hà Nội đã chứng tỏ là một tài sản tăng trưởng rất bền bỉ, với mức tăng tổng thể từ 70% đến 90%.",
      },
      {
        animation: HnChungCuAnimation3,
        description:
          "Điều đáng nói là sự tăng trưởng này diễn ra một cách ổn định, không trải qua những cú sốc giảm giá sâu như các phân khúc khác.",
      },
      {
        animation: HnChungCuAnimation4, // Trang 3
        title: "Động lực chính",
        description:
          "Sức mạnh của phân khúc này đến từ nhu cầu ở thực. Ngay cả trong giai đoạn thị trường khó khăn nhất (2022-2023), giá chung cư vẫn được neo giữ vững chắc vì người mua để ở, họ không dễ dàng bán cắt lỗ.",
      },
      {
        animation: HnChungCuAnimation5, // Trang 4
        description:
          "Khi thị trường phục hồi, sự khan hiếm nguồn cung mới càng đẩy giá trị của các dự án hiện hữu tăng lên.",
      },
      {
        animation: HnChungCuAnimation6, // Trang 5
        title: "Ý nghĩa với bạn (người mua nhà)",
        description:
          "Việc lựa chọn chung cư mang lại một nền tảng vững chắc cho kế hoạch của bạn. Sự ổn định về giá giúp bạn an tâm tập trung vào việc tích lũy mà không phải quá lo lắng về những biến động ngắn hạn của thị trường.",
      },
    ],
    "Nhà mặt đất": [
      {
        image: "/onboarding/hanoi-nhadat.png",
        // Thay thế 'description' và 'highlight' bằng cấu trúc này
        summaryParts: [
          { text: "Lựa chọn của bạn đòi hỏi" },
          { text: "sự kiên nhẫn", highlight: true },
          { text: " và " },
          { text: "am hiểu sâu sắc về chu kỳ.", highlight: true },
        ],
      },
      {
        animation: HnNhaDatAnimation2,
        title: "Bức tranh toàn cảnh",
        description:
          "Phân khúc nhà đất Hà Nội tăng giá rất ổn định, không có những cú sốt giá lớn hay giảm giá sâu. Trong 5 năm qua, giá đã tăng khoảng 50% đến 60%. Giá trị tăng trưởng đều đặn qua từng năm.",
      },
      {
        animation: HnNhaDatAnimation3, // Trang 3
        title: "Động lực chính",
        description:
          "Nhu cầu mua để ở và để dành luôn ở mức cao. Điều này giúp giá nhà đất tại Hà Nội tăng trưởng bền vững.",
      },
      {
        animation: HnNhaDatAnimation4, // Trang 4
        description:
          "Khi thị trường phục hồi, sự khan hiếm nguồn cung mới càng đẩy giá trị của các dự án hiện hữu tăng lên.",
      },
      {
        animation: HnNhaDatAnimation5, // Trang 5
        title: "Ý nghĩa với bạn (người mua nhà)",
        description:
          "Lựa chọn nhà đất đòi hỏi một tầm nhìn dài hạn và sự kiên nhẫn. Tiềm năng của nó nằm ở giá trị đất đai lâu dài và sự tự do trong việc xây dựng tổ ấm. ",
      },
      {
        animation: HnNhaDatAnimation6, // Trang 4
        description:
          "Tuy nhiên, bạn cần chuẩn bị tâm lý cho những biến động của chu kỳ và không nên kỳ vọng vào việc tăng giá nhanh chóng trong ngắn hạn. Hãy tập trung vào giá trị sử dụng và khả năng tài chính của mình thay vì chạy theo các cơn sốt.",
      },
    ],
  },
  "TP. Hồ Chí Minh": {
    "Chung cư": [
      {
        image: "/onboarding/hcmc-chungcu.png",
        // Thay thế 'description' và 'highlight' bằng cấu trúc này
        summaryParts: [
          { text: "Bạn đang lựa chọn một thị trường của" },
          { text: "giá trị thực", highlight: true },
          { text: " và " },
          { text: "sự bền vững.", highlight: true },
        ],
      },
      // Các trang tiếp theo giữ nguyên
      {
        animation: HcmcChungCuAnimation2,
        title: "Bức tranh toàn cảnh",
        description:
          "Chung cư TP.HCM là một kênh giữ giá trị tốt với mức tăng trưởng tổng thể 35% đến 50% trong 5 năm, chủ yếu là do sự khan hiếm nguồn cung sơ cấp.",
      },
      {
        animation: HcmcChungCuAnimation3,
        description:
          "So với Hà Nội, đà tăng giá chung cư tại TP. Hồ Chí Minh có phần chậm hơn do mặt bằng giá ban đầu đã ở mức cao.",
      },
      {
        animation: HcmcChungCuAnimation4, // Trang 3
        title: "Động lực chính",
        description:
          "Yếu tố quyết định đến giá trị chung cư tại TP.HCM là sự khan hiếm nguồn cung các dự án mới. Khi nguồn cung sơ cấp hạn chế, nhu cầu sẽ dồn về thị trường thứ cấp (mua đi bán lại), từ đó giúp các dự án hiện hữu duy trì và gia tăng giá trị.",
      },
      {
        animation: HcmcChungCuAnimation6, // Trang 5
        title: "Ý nghĩa với bạn (người mua nhà)",
        description:
          "Lựa chọn chung cư tại TP.HCM là một quyết định đầu tư vào giá trị thực và sự khan hiếm. Sự ổn định của phân khúc này giúp bạn dễ dàng lập kế hoạch tài chính hơn.",
      },
      {
        animation: HcmcChungCuAnimation5, // Trang 4
        description:
          "Việc giá trị tài sản được bảo chứng bởi các yếu tố nền tảng (nguồn cung, nhu cầu ở thực) sẽ giúp bạn tự tin hơn rằng ngôi nhà của mình là một tài sản bền vững theo thời gian.",
      },
    ],
    "Nhà mặt đất": [
      {
        image: "/onboarding/hcmc-nhadat.png",
        summaryParts: [
          { text: "Đây là một thị trường có" },
          { text: "sự biến động mạnh.", highlight: true },
        ],
      },
      {
        animation: HcmcNhaDatAnimation2,
        title: "Bức tranh toàn cảnh",
        description:
          "Phân khúc nhà đất tại TP.HCM cũng trải qua một chu kỳ biến động mạnh, với mức tăng trưởng tổng thể 5 năm khoảng 30% đến 40%.",
      },
      {
        animation: HcmcNhaDatAnimation3,
        description:
          "Một đặc điểm quan trọng là sự liên kết chặt chẽ với các thị trường vệ tinh như Bình Dương, Đồng Nai.",
      },
      {
        animation: HcmcNhaDatAnimation4, // Trang 3
        title: "Động lực chính",
        description: "Các cơn sốt đất nền vùng ven (2020-2022) được thúc đẩy bởi dòng tiền đầu cơ và các thông tin quy hoạch hạ tầng.",
      },
      {
        animation: HcmcNhaDatAnimation5, // Trang 4
        description:
          "Khi thị trường trầm lắng (2022-2023), phân khúc này đã điều chỉnh đáng kể và đang trong giai đoạn phục hồi chậm.",
      },
      {
        animation: HcmcNhaDatAnimation6, // Trang 5
        title: "Ý nghĩa với bạn (người mua nhà)",
        description:
          "Việc mua nhà đất là một cam kết lâu dài với giá trị cốt lõi nằm ở quyền sở hữu đất. Kế hoạch của bạn cần tính đến các yếu tố chu kỳ và không nên quá phụ thuộc vào các đòn bẩy tài chính ngắn hạn.",
      },
      {
        animation: HcmcNhaDatAnimation7, // Trang 4
        description:
          'Hãy tập trung vào các khu vực có tiềm năng phát triển hạ tầng thực sự và xác định đây là một tài sản để "an cư" và tích lũy giá trị trong dài hạn, thay vì kỳ vọng lợi nhuận nhanh chóng.',
      },
    ],
  },
};

const getAnalysisContent = (
  city: string | undefined,
  propertyType: string | undefined,
) => {
  if (!city || !propertyType) return null;
  return analysisContent[city]?.[propertyType] || null;
};

interface QuickCheckProps {
  quickCheck?: OnboardingPlanState;
  initialData?: OnboardingPlanState;
  planId?: string;
  onCompleted: (data: {
    onboardingData: Partial<OnboardingPlanState>;
    quickCheckResult: QuickCheckResultPayload;
  }) => void;
  isEditMode?: boolean;
  initialStep?: "intro" | "form1";
}

export default function QuickCheck({ onCompleted, initialData = {}, isEditMode = false, initialStep = "intro" }: QuickCheckProps) {
  const [step, setStep] = useState<"intro" | "form1" | "analysis" | "form2" | "loading" | "result">(
    initialStep,
  );
  // 2. State bây giờ sẽ lưu chỉ số (index) của animation hiện tại
  const [currentAnimationIndex, setCurrentAnimationIndex] = useState(0);
  const [result, setResult] = useState<QuickCheckResultPayload | null>(null);

  // 2. STATE MỚI ĐỂ THEO DÕI TRANG HIỆN TẠI CỦA PHẦN ANALYSIS
  const [analysisStepIndex, setAnalysisStepIndex] = useState(0);
  // 2. State để theo dõi hướng chuyển động (1: next, -1: back)
  const [direction, setDirection] = useState(1);

  // 2. Tạo một ref để gắn vào container của phần analysis
  const analysisContainerRef = useRef<HTMLDivElement | null>(null);

  const router = useRouter();
  const { isSignedIn } = useAuth();

  const processedInitialData = useMemo(() => {
    if (initialData.targetHousePriceN0) {
      return {
        ...initialData,
        targetHousePriceN0: initialData.targetHousePriceN0 / 1000,
      };
    }
    return initialData;
  }, [initialData]);

  const [formData, setFormData] =
    useState<Partial<OnboardingPlanState>>(processedInitialData);
  const [progress, setProgress] = useState({ current: 0, total: 1 });
  const [form1InitialIndex, setForm1InitialIndex] = useState(0);
  const [introStep, setIntroStep] = useState(0);

  const introSlides = [
    {
      title: "Đánh giá tính khả thi",
      description:
        "Kiểm tra sức khỏe tài chính ở hiện tại và tương lai. Bạn sẽ biết xem có thể mua nhà mong muốn hay không, và có những cách nào để mua nhà dễ hơn, nhanh chóng hơn.",
      image: "/onboarding/intro-1.png", // Thay bằng đường dẫn ảnh của bạn
    },
    {
      title: "Xây dựng kế hoạch cụ thể",
      description:
        "Biết sản phẩm phù hợp, số tiền đang có nên mua nhà nào, kênh tham khảo, ở đâu, tài chính, lộ trình và các yếu tố tài chính tự giải cho bài toán mua nhà 1 cách đúng đắn.",
      image: "/onboarding/intro-2.png", // Thay bằng đường dẫn ảnh của bạn
    },
    {
      title: "Chuyên gia đứng về phía bạn",
      description:
        "Các chuyên gia tài chính và chuyên gia công nghệ luôn sẵn sàng để hỗ trợ. Chúng tôi tối ưu quyền lợi của bạn trên thị trường, đưa ra khuyến nghị phù hợp với khả năng và mong muốn của bạn.",
      image: "/onboarding/intro-3.png", // Thay bằng đường dẫn ảnh của bạn
    },
  ];

  // Reset trang analysis về 0 mỗi khi người dùng vào bước này
  useEffect(() => {
    if (step === 'analysis') {
      setAnalysisStepIndex(0);
    }
  }, [step]);

  // Sync step with initialStep prop
  useEffect(() => {
    setStep(initialStep);
  }, [initialStep]);

  const defaultValues = useMemo(() => processedInitialData, [processedInitialData]);

  const questions1 = useMemo(() => quickCheckQuestionsPart1, []);
  const questions2 = useMemo(() => quickCheckQuestionsPart2, []);

  const visibleQuestionsPart1 = useMemo(() => {
    return questions1.filter((q) => !q.condition || q.condition(formData));
  }, [questions1, formData]);

  const visibleQuestionsPart2 = useMemo(() => {
    const combinedData = { ...defaultValues, ...formData };
    return questions2.filter((q) => !q.condition || q.condition(combinedData));
  }, [questions2, formData, defaultValues]);

  const totalSteps = useMemo(() => {
    const hasAnalysisStep = getAnalysisContent(
      formData.targetLocation,
      formData.targetHouseType,
    );
    return visibleQuestionsPart1.length + (hasAnalysisStep ? 1 : 0) + visibleQuestionsPart2.length;
  }, [visibleQuestionsPart1, visibleQuestionsPart2, formData.targetLocation, formData.targetHouseType]);

  const handleStep1Change = useCallback((current: number) => {
    setProgress({ current: current + 1, total: totalSteps });
  }, [totalSteps]);

  const handleStep2Change = useCallback((current: number) => {
    const hasAnalysisStep = getAnalysisContent(
      formData.targetLocation,
      formData.targetHouseType,
    );
    const baseProgress = visibleQuestionsPart1.length + (hasAnalysisStep ? 1 : 0);
    setProgress({ current: baseProgress + current + 1, total: totalSteps });
  }, [
    totalSteps,
    visibleQuestionsPart1.length,
    formData.targetLocation,
    formData.targetHouseType,
  ]);

  const handleStart = () => {
    setForm1InitialIndex(0);
    setStep("form1");
  };

  const handleSubmitPart1 = (data: Partial<OnboardingPlanState>) => {
    const newFormData = { ...formData, ...data };
    setFormData(newFormData);
    const content = getAnalysisContent(
      data.targetLocation as string,
      data.targetHouseType as string,
    );

    if (content) {
      setStep("analysis");
      setProgress({ current: visibleQuestionsPart1.length + 1, total: totalSteps });
    } else {
      setStep("form2");
      setProgress({ current: visibleQuestionsPart1.length + 1, total: totalSteps });
    }
  };

  const handleContinueFromAnalysis = useCallback(() => {
    setStep("form2");
  }, []);

  const analysisSteps = useMemo(() => {
    if (step !== 'analysis') return null;
    return getAnalysisContent(
      formData.targetLocation as string,
      formData.targetHouseType as string,
    );
  }, [step, formData.targetLocation, formData.targetHouseType]);

  const handleAnalysisBack = useCallback(() => {
    setDirection(-1); // 4. Đặt hướng là 'back'
    if (analysisStepIndex > 0) {
      setAnalysisStepIndex(analysisStepIndex - 1);
    } else {
      setForm1InitialIndex(visibleQuestionsPart1.length - 1);
      setStep("form1");
      setProgress({
        current: visibleQuestionsPart1.length,
        total: totalSteps,
      });
    }
  }, [analysisStepIndex, visibleQuestionsPart1.length, totalSteps]);

  const handleAnalysisNext = useCallback(() => {
    setDirection(1); // 5. Đặt hướng là 'next'
    if (analysisSteps && analysisStepIndex < analysisSteps.length - 1) {
      setAnalysisStepIndex(analysisStepIndex + 1);
    } else {
      handleContinueFromAnalysis();
    }
  }, [analysisStepIndex, analysisSteps, handleContinueFromAnalysis]);

  useEffect(() => {
    // Chỉ chạy logic khi ở đúng bước và ref đã sẵn sàng
    if (step !== 'analysis' || !analysisContainerRef.current) {
      return;
    }

    const node = analysisContainerRef.current;
    let touchStartY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const touchEndY = e.changedTouches[0].clientY;
      const swipeDownDistance = touchEndY - touchStartY;
      const swipeUpDistance = touchStartY - touchEndY;

      // Lướt xuống để qua trang tiếp theo
      if (swipeDownDistance > 50) {
        handleAnalysisNext();
      }
      // Lướt lên để quay lại trang trước
      else if (swipeUpDistance > 50) {
        handleAnalysisBack();
      }
    };

    node.addEventListener("touchstart", handleTouchStart);
    node.addEventListener("touchend", handleTouchEnd);

    return () => {
      node.removeEventListener("touchstart", handleTouchStart);
      node.removeEventListener("touchend", handleTouchEnd);
    };
  }, [step, handleAnalysisBack, handleAnalysisNext]);

  const handleSubmitPart2 = async (data: Partial<OnboardingPlanState>) => {
    const finalData = { ...formData, ...data };

    if (isEditMode) {
      onCompleted({
        onboardingData: finalData,
        quickCheckResult: result as QuickCheckResultPayload,
      });
      return;
    }

    setStep("loading");

    const processedData: Partial<OnboardingPlanState> = {
      ...finalData,
      hasCoApplicant: (finalData.hasCoApplicant || false),
      targetHousePriceN0: (finalData.targetHousePriceN0 || 0),
      initialSavings: (finalData.initialSavings || 0),
      userMonthlyIncome: (finalData.userMonthlyIncome || 0),
      monthlyLivingExpenses: (finalData.monthlyLivingExpenses || 0),
      yearsToPurchase: (finalData.yearsToPurchase || 0),
    };

    try {
      const response = await calculateQuickCheckResult(processedData);
      if (response.success && response) {
        setResult(response);
        setFormData(processedData); // Save the completed data
        setStep("result");
      } else {
        toast.error(response.error || "Không thể tính toán. Vui lòng thử lại.");
        setStep("form2"); // Go back to the form
      }
    } catch (error) {
      console.error("Quick check calculation failed", error);
      toast.error("Đã xảy ra lỗi kết nối. Vui lòng thử lại.");
      setStep("form2");
    }
  };

  const handleContinueFromResult = () => {
    if (!result) return;
    onCompleted({
      onboardingData: formData,
      quickCheckResult: result,
    });
  };

  if (step === "intro") {
    return (
      <>
        <style jsx global>{`
          .swiper-pagination-bullet {
            background-color: rgba(255, 255, 255, 255) !important;
            width: 24px !important; /* Tăng chiều rộng */
            height: 4px !important; /* Giảm chiều cao */
            border-radius: 2px !important; /* Bo góc nhẹ để thành thanh ngang */
            opacity: 1 !important;
            transition: width 0.3s ease; /* Thêm hiệu ứng chuyển động mượt mà */
          }
          .swiper-pagination-bullet-active {
            background-color: #00ACB8 !important; /* Màu xanh cyan cho thanh active */
            width: 32px !important; /* Làm cho thanh active dài hơn một chút */
          }
        `}</style>
        {/* <div className="max-w-5xl mx-auto fixed inset-0 bg-[#121212] z-0" /> */}
        <div className="max-w-5xl mx-auto fixed inset-0 flex flex-col text-white z-10 pb-35 max-md:pb-28">
          <Swiper
            modules={[Pagination]}
            pagination={{ clickable: true }}
            onSlideChange={(swiper) => setIntroStep(swiper.activeIndex)}
            className="w-full h-full"
          >
            {introSlides.map((slide, index) => (
              <SwiperSlide
                key={index}
                className="flex flex-col h-full" // Đảm bảo slide chiếm toàn bộ chiều cao
              >
                <div className="flex flex-col h-full justify-between">
                  {/* Phần trên: Hình ảnh, chiếm không gian trống và căn giữa */}
                  <div className="flex-grow flex items-center justify-center">
                    <Image
                      src={slide.image}
                      alt={slide.title}
                      width={250}
                      height={250}
                      className="object-contain"
                    />
                  </div>

                  {/* Phần dưới: Nhóm văn bản và các nút bấm lại với nhau */}
                  <div className="flex-shrink-0 px-2"> {/* Giảm padding bottom ở đây */}
                    {/* Khối văn bản */}
                    <div className="mb-8"> {/* Thêm margin bottom để tạo khoảng cách với nút */}
                      <h1 className="text-2xl font-bold mb-4">
                        {slide.title}
                      </h1>
                      <p className="text-sm text-white/80 pr-6">
                        {slide.description}
                      </p>
                    </div>
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>

          <div className="fixed bottom-0 left-0 right-0">
            <div className="max-w-5xl mx-auto mb-5 max-md:mb-3 px-2">
              <div className="space-y-3">
                <Button
                  onClick={handleStart}
                  className="w-full bg-[#00ACB8] text-white hover:bg-[#22d3ee]/80 py-6 max-md:py-5 text-md font-semibold rounded-lg transition-transform transform active:scale-95"
                >
                  Bắt đầu ngay
                </Button>
                {!isSignedIn && (
                  <Button
                    onClick={() => router.push("/sign-in")}
                    className="w-full bg-white text-slate-900 hover:bg-slate-200 py-6 max-md:py-5 text-md font-semibold rounded-lg transition-transform transform active:scale-95"
                  >
                    Đăng nhập (Nếu đã có tài khoản)
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (step === "loading" && !isEditMode) {
    return (
      <div className="max-w-5xl mx-auto fixed inset-0 flex flex-col py-4 z-10 bg-[#121212] text-white">
        <LoadingOverlay messages={["Đang kiểm tra khả năng mua nhà..."]} />
      </div>
    );
  }

  if (step === "result" && result && !isEditMode) {
    const yearsToPurchase = (formData.yearsToPurchase ?? new Date().getFullYear()) - new Date().getFullYear();
    console.log("result", result);

    const partialPlan: Partial<PlanWithDetails> = {
      yearsToPurchase: yearsToPurchase,
      hasCoApplicant: formData.hasCoApplicant ?? false,
      targetHousePriceN0: (formData.targetHousePriceN0 ?? 0) * 1000,
      initialSavings: formData.initialSavings ?? 0,
      userMonthlyIncome: formData.userMonthlyIncome ?? 0,
      monthlyLivingExpenses: formData.monthlyLivingExpenses ?? 0,
      confirmedPurchaseYear: formData.yearsToPurchase ?? 0,
      pctSalaryGrowth: 7.0,
      pctHouseGrowth: 10.0,
      pctInvestmentReturn: 11.0,
      pctExpenseGrowth: 4.0,
      loanInterestRate: 11.0,
      loanTermYears: 25,
      monthlyNonHousingDebt: 0,
      currentAnnualInsurancePremium: 0,
      hasNewChild: false,
      yearToHaveChild: 0,
      monthlyChildExpenses: 0,
      paymentMethod: "fixed",
      coApplicantSalaryGrowth: 7.0,
    };

    // Chạy hàm tính toán projection với đối tượng plan tạm thời
    const projectionData = result.projectionData;
    const targetYearProjection: ProjectionRow | undefined =
      projectionData?.find(p => p.isAffordable);

    const displayPlan = { ...partialPlan };

    return (
      <ResultsClient plan={displayPlan as any} firstYearProjection={targetYearProjection} onNext={handleContinueFromResult} onBack={() => setStep("form2")} />
    );
  }

  // 3. CẬP NHẬT GIAO DIỆN PHẦN ANALYSIS
  // Xóa bỏ hoàn toàn logic cũ của `analysis` và thay bằng logic dưới đây
  if (step === "analysis") {
    const { targetLocation, targetHouseType } = formData;
    const content = getAnalysisContent(
      targetLocation as string,
      targetHouseType as string,
    );
    if (!content) return null;
    // Bây giờ, analysisSteps đã được tính toán ở trên
    if (!analysisSteps || analysisSteps.length === 0) {
      // Nếu không có nội dung, chuyển thẳng tới form 2
      setStep("form2");
      return null;
    }

    const currentStepContent = analysisSteps[analysisStepIndex];
    const isLastStep = analysisStepIndex === analysisSteps.length - 1;

    // 3. Định nghĩa các variants cho animation
    const slideVariants = {
      enter: (direction: number) => ({
        x: direction > 0 ? "100%" : "-100%",
        opacity: 0,
      }),
      center: {
        zIndex: 1,
        x: 0,
        opacity: 1,
      },
      exit: (direction: number) => ({
        zIndex: 0,
        x: direction < 0 ? "100%" : "-100%",
        opacity: 0,
      }),
    };

    return (
      // 4. Gắn ref vào container chính
      <div
        ref={analysisContainerRef}
        className="flex flex-col h-full flex-grow overflow-hidden mt-2" // Thêm overflow-hidden
      >
        <div className="pb-3">
          <div className="relative flex items-center h-10">
            <div className="absolute left-0 top-1/2 -translate-y-1/2">
              <Button variant="ghost" size="icon" onClick={handleAnalysisBack}>
                <ArrowLeftIcon className="h-12 w-12" />
              </Button>
            </div>
            {/* Thêm whitespace-nowrap để ngăn tiêu đề xuống dòng */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-semibold text-white text-lg whitespace-nowrap">
              Phân tích thị trường
            </div>
          </div>
        </div>
        <div className="relative flex-grow flex flex-col items-center text-center">
          {/* 6. Bọc nội dung động bằng AnimatePresence và motion.div */}
          <AnimatePresence initial={false} custom={direction}>
            <motion.div
              key={analysisStepIndex} // Key rất quan trọng để AnimatePresence hoạt động
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 },
              }}
              className="absolute w-full h-full flex flex-col items-center" // Thêm padding top
            >

              {/* 2. Render có điều kiện dựa trên dữ liệu */}
              {currentStepContent.animation ? (
                // Giao diện cho các trang chi tiết (có animation)
                // 1. Sửa typo và thêm flex-grow để cho phép cuộn
                // 2. Dọn dẹp các class con để code sạch hơn
                <div className="w-full max-w-5xl pl-3 flex-grow overflow-y-auto pb-12">
                  <h2 className="text-xl max-md:text-base text-left font-bold text-cyan-400 mb-4">
                    {currentStepContent.title}
                  </h2>
                  <p className="text-white/80 text-left mb-4 max-md:text-sm pr-2">
                    {currentStepContent.description}
                  </p>
                  <LottieAnimation
                    animationData={currentStepContent.animation}
                    style={{ width: "80%", maxWidth: 350, height: "auto" }}
                    className="mb-6 mx-auto" // Tự động căn giữa animation
                    loop={false}
                  />
                </div>
              ) : (
                // Giao diện cho trang giới thiệu đầu tiên (có ảnh tĩnh)
                <>
                  <p className="text-base font-bold px-12 pb-4">
                    Bạn muốn mua
                    <br />
                    {targetHouseType} tại {targetLocation}
                  </p>
                  <Image
                    src={currentStepContent.image}
                    alt="Phân tích lựa chọn"
                    width={500}
                    height={500}
                    className="w-full max-w-lg object-contain mb-8 px-2"
                  />
                  {/* Render lại theo cấu trúc dữ liệu mới */}
                  <p className="text-lg text-white/80 text-center">
                    {currentStepContent.summaryParts[0].text}
                    <br />
                    {currentStepContent.summaryParts.slice(1).map((part: { text: string; highlight: boolean }, index: number) => (
                      <span
                        key={index}
                        className={part.highlight ? "text-cyan-400" : ""}
                      >
                        {part.text}
                      </span>
                    ))}
                  </p>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
        {/* Nút điều hướng không đổi */}
        <div className="fixed bottom-0 left-0 right-0 z-20 bg-[#121212]">
          <div className="max-w-5xl mx-auto p-4">
            {isLastStep ? (
              <Button
                onClick={handleAnalysisNext}
                className="w-full bg-white text-slate-900 hover:bg-slate-200 py-4 text-lg font-semibold rounded-lg transition-transform transform active:scale-95"
              >
                Tiếp tục
              </Button>
            ) : (
              <div className="flex justify-end">
                <Button
                  onClick={handleAnalysisNext}
                  size="icon"
                  className="bg-cyan-500 text-white hover:bg-cyan-600 rounded-full h-14 w-14"
                >
                  <ArrowRightIcon className="h-9 w-9" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto fixed inset-0 flex flex-col py-4 z-10 bg-[#121212] text-white">
      {step === "form1" && (
        <MultiStepQuestionForm
          key="form1"
          questions={questions1}
          onSubmit={handleSubmitPart1}
          title="Kiểm tra"
          subtitle="Tôi có mua được nhà không?"
          defaultValues={formData}
          onBackFromFirst={() => setStep("intro")}
          onStepChange={handleStep1Change}
          progressCurrent={progress.current}
          progressTotal={totalSteps}
          initialQuestionIndex={form1InitialIndex}
          autoSubmitOnLastOption={true}
        />
      )}

      {step === "form2" && (
        <MultiStepQuestionForm
          key="form2"
          questions={questions2}
          onSubmit={handleSubmitPart2}
          title="Kiểm tra"
          subtitle="Tôi có mua được nhà không?"
          defaultValues={formData}
          onBackFromFirst={() => {
            const hasAnalysisStep = getAnalysisContent(
              formData.targetLocation,
              formData.targetHouseType,
            );
            if (hasAnalysisStep) {
              setStep("analysis");
              setProgress({
                current: visibleQuestionsPart1.length + 1,
                total: totalSteps,
              });
            } else {
              setStep("form1");
              setProgress({
                current: visibleQuestionsPart1.length,
                total: totalSteps,
              });
            }
          }}
          onStepChange={handleStep2Change}
          progressCurrent={progress.current}
          progressTotal={totalSteps}
          isFinalForm={true}
        />
      )}
    </div>
  );
}