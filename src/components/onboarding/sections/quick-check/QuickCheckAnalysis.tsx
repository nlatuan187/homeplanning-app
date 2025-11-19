"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import LottieAnimation from "@/components/ui/lottieAnimation";
import { OnboardingPlanState } from "../../types";

// Import animations (Assuming these paths are correct relative to this file)
import HcmcChungCuAnimation2 from "../../../../../public/lottie/HCMCCScene2.json";
import HcmcChungCuAnimation3 from "../../../../../public/lottie/HCMCCScene3.json";
import HcmcChungCuAnimation4 from "../../../../../public/lottie/HCMCCScene4.json";
import HcmcChungCuAnimation5 from "../../../../../public/lottie/HCMCCScene5.json";
import HcmcChungCuAnimation6 from "../../../../../public/lottie/HCMCCScene6.json";
import HnNhaDatAnimation2 from "../../../../../public/lottie/HNDScene2.json";
import HnNhaDatAnimation3 from "../../../../../public/lottie/HNDScene3.json";
import HnNhaDatAnimation4 from "../../../../../public/lottie/HNDScene4.json";
import HnNhaDatAnimation5 from "../../../../../public/lottie/HNDScene5.json";
import HnNhaDatAnimation6 from "../../../../../public/lottie/HNDScene6.json";
import HnChungCuAnimation2 from "../../../../../public/lottie/HNCCScene2.json";
import HnChungCuAnimation3 from "../../../../../public/lottie/HNCCScene3.json";
import HnChungCuAnimation4 from "../../../../../public/lottie/HNCCScene4.json";
import HnChungCuAnimation5 from "../../../../../public/lottie/HNCCScene5.json";
import HnChungCuAnimation6 from "../../../../../public/lottie/HNCCScene6.json";
import HcmcNhaDatAnimation2 from "../../../../../public/lottie/HCMDScene2.json";
import HcmcNhaDatAnimation3 from "../../../../../public/lottie/HCMDScene3.json";
import HcmcNhaDatAnimation4 from "../../../../../public/lottie/HCMDScene4.json";
import HcmcNhaDatAnimation5 from "../../../../../public/lottie/HCMDScene5.json";
import HcmcNhaDatAnimation6 from "../../../../../public/lottie/HCMDScene6.json";
import HcmcNhaDatAnimation7 from "../../../../../public/lottie/HCMDScene7.json";
import Image from "next/image";

// --- Analysis Content Data ---
const analysisContent: any = {
    "Hà Nội": {
        "Chung cư": [
            {
                image: "/onboarding/hanoi-chungcu.png",
                summaryParts: [
                    { text: "Lựa chọn của bạn đang tập trung vào" },
                    { text: "sự an toàn", highlight: true },
                    { text: " và " },
                    { text: "tăng trưởng ổn định.", highlight: true },
                ],
            },
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
                animation: HnChungCuAnimation4,
                title: "Động lực chính",
                description:
                    "Sức mạnh của phân khúc này đến từ nhu cầu ở thực. Ngay cả trong giai đoạn thị trường khó khăn nhất (2022-2023), giá chung cư vẫn được neo giữ vững chắc vì người mua để ở, họ không dễ dàng bán cắt lỗ.",
            },
            {
                animation: HnChungCuAnimation5,
                description:
                    "Khi thị trường phục hồi, sự khan hiếm nguồn cung mới càng đẩy giá trị của các dự án hiện hữu tăng lên.",
            },
            {
                animation: HnChungCuAnimation6,
                title: "Ý nghĩa với bạn (người mua nhà)",
                description:
                    "Việc lựa chọn chung cư mang lại một nền tảng vững chắc cho kế hoạch của bạn. Sự ổn định về giá giúp bạn an tâm tập trung vào việc tích lũy mà không phải quá lo lắng về những biến động ngắn hạn của thị trường.",
            },
        ],
        "Nhà mặt đất": [
            {
                image: "/onboarding/hanoi-nhadat.png",
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
                animation: HnNhaDatAnimation3,
                title: "Động lực chính",
                description:
                    "Nhu cầu mua để ở và để dành luôn ở mức cao. Điều này giúp giá nhà đất tại Hà Nội tăng trưởng bền vững.",
            },
            {
                animation: HnNhaDatAnimation4,
                description:
                    "Khi thị trường phục hồi, sự khan hiếm nguồn cung mới càng đẩy giá trị của các dự án hiện hữu tăng lên.",
            },
            {
                animation: HnNhaDatAnimation5,
                title: "Ý nghĩa với bạn (người mua nhà)",
                description:
                    "Lựa chọn nhà đất đòi hỏi một tầm nhìn dài hạn và sự kiên nhẫn. Tiềm năng của nó nằm ở giá trị đất đai lâu dài và sự tự do trong việc xây dựng tổ ấm. ",
            },
            {
                animation: HnNhaDatAnimation6,
                description:
                    "Tuy nhiên, bạn cần chuẩn bị tâm lý cho những biến động của chu kỳ và không nên kỳ vọng vào việc tăng giá nhanh chóng trong ngắn hạn. Hãy tập trung vào giá trị sử dụng và khả năng tài chính của mình thay vì chạy theo các cơn sốt.",
            },
        ],
    },
    "TP. Hồ Chí Minh": {
        "Chung cư": [
            {
                image: "/onboarding/hcmc-chungcu.png",
                summaryParts: [
                    { text: "Bạn đang lựa chọn một thị trường của" },
                    { text: "giá trị thực", highlight: true },
                    { text: " và " },
                    { text: "sự bền vững.", highlight: true },
                ],
            },
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
                animation: HcmcChungCuAnimation4,
                title: "Động lực chính",
                description:
                    "Yếu tố quyết định đến giá trị chung cư tại TP.HCM là sự khan hiếm nguồn cung các dự án mới. Khi nguồn cung sơ cấp hạn chế, nhu cầu sẽ dồn về thị trường thứ cấp (mua đi bán lại), từ đó giúp các dự án hiện hữu duy trì và gia tăng giá trị.",
            },
            {
                animation: HcmcChungCuAnimation6,
                title: "Ý nghĩa với bạn (người mua nhà)",
                description:
                    "Lựa chọn chung cư tại TP.HCM là một quyết định đầu tư vào giá trị thực và sự khan hiếm. Sự ổn định của phân khúc này giúp bạn dễ dàng lập kế hoạch tài chính hơn.",
            },
            {
                animation: HcmcChungCuAnimation5,
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
                animation: HcmcNhaDatAnimation4,
                title: "Động lực chính",
                description: "Các cơn sốt đất nền vùng ven (2020-2022) được thúc đẩy bởi dòng tiền đầu cơ và các thông tin quy hoạch hạ tầng.",
            },
            {
                animation: HcmcNhaDatAnimation5,
                description:
                    "Khi thị trường trầm lắng (2022-2023), phân khúc này đã điều chỉnh đáng kể và đang trong giai đoạn phục hồi chậm.",
            },
            {
                animation: HcmcNhaDatAnimation6,
                title: "Ý nghĩa với bạn (người mua nhà)",
                description:
                    "Việc mua nhà đất là một cam kết lâu dài với giá trị cốt lõi nằm ở quyền sở hữu đất. Kế hoạch của bạn cần tính đến các yếu tố chu kỳ và không nên quá phụ thuộc vào các đòn bẩy tài chính ngắn hạn.",
            },
            {
                animation: HcmcNhaDatAnimation7,
                description:
                    'Hãy tập trung vào các khu vực có tiềm năng phát triển hạ tầng thực sự và xác định đây là một tài sản để "an cư" và tích lũy giá trị trong dài hạn, thay vì kỳ vọng lợi nhuận nhanh chóng.',
            },
        ],
    },
};

export const getAnalysisContent = (
    city: string | undefined,
    propertyType: string | undefined,
) => {
    if (!city || !propertyType) return null;
    return analysisContent[city]?.[propertyType] || null;
};

interface QuickCheckAnalysisProps {
    formData: Partial<OnboardingPlanState>;
    onBack: () => void;
    onNext: () => void;
}

export default function QuickCheckAnalysis({ formData, onBack, onNext }: QuickCheckAnalysisProps) {
    const [analysisStepIndex, setAnalysisStepIndex] = useState(0);
    const [direction, setDirection] = useState(1);
    const analysisContainerRef = useRef<HTMLDivElement | null>(null);

    const analysisSteps = useMemo(() => {
        return getAnalysisContent(
            formData.targetLocation as string,
            formData.targetHouseType as string,
        );
    }, [formData.targetLocation, formData.targetHouseType]);

    const handleAnalysisBack = useCallback(() => {
        setDirection(-1);
        if (analysisStepIndex > 0) {
            setAnalysisStepIndex(analysisStepIndex - 1);
        } else {
            onBack();
        }
    }, [analysisStepIndex, onBack]);

    const handleAnalysisNext = useCallback(() => {
        setDirection(1);
        if (analysisSteps && analysisStepIndex < analysisSteps.length - 1) {
            setAnalysisStepIndex(analysisStepIndex + 1);
        } else {
            onNext();
        }
    }, [analysisStepIndex, analysisSteps, onNext]);

    // Swipe logic removed to prevent conflict with scrolling
    // useEffect(() => {
    //     if (!analysisContainerRef.current) return;

    //     const node = analysisContainerRef.current;
    //     let touchStartY = 0;

    //     const handleTouchStart = (e: TouchEvent) => {
    //         touchStartY = e.touches[0].clientY;
    //     };

    //     const handleTouchEnd = (e: TouchEvent) => {
    //         const touchEndY = e.changedTouches[0].clientY;
    //         const swipeDownDistance = touchEndY - touchStartY;
    //         const swipeUpDistance = touchStartY - touchEndY;

    //         if (swipeDownDistance > 50) {
    //             handleAnalysisNext();
    //         } else if (swipeUpDistance > 50) {
    //             handleAnalysisBack();
    //         }
    //     };

    //     node.addEventListener("touchstart", handleTouchStart);
    //     node.addEventListener("touchend", handleTouchEnd);

    //     return () => {
    //         node.removeEventListener("touchstart", handleTouchStart);
    //         node.removeEventListener("touchend", handleTouchEnd);
    //     };
    // }, [handleAnalysisBack, handleAnalysisNext]);

    if (!analysisSteps || analysisSteps.length === 0) return null;

    const currentStepContent = analysisSteps[analysisStepIndex];
    const isLastStep = analysisStepIndex === analysisSteps.length - 1;

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
        <div
            ref={analysisContainerRef}
            className="flex flex-col h-full flex-grow overflow-hidden mt-2"
        >
            <div className="pb-3">
                <div className="relative flex items-center h-10">
                    <div className="absolute left-0 top-1/2 -translate-y-1/2">
                        <Button variant="ghost" size="icon" onClick={handleAnalysisBack}>
                            <ArrowLeftIcon className="h-12 w-12" />
                        </Button>
                    </div>
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-semibold text-white text-lg whitespace-nowrap">
                        Phân tích thị trường
                    </div>
                </div>
            </div>
            <div className="relative flex-grow flex flex-col items-center text-center">
                <AnimatePresence initial={false} custom={direction}>
                    <motion.div
                        key={analysisStepIndex}
                        custom={direction}
                        variants={slideVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{
                            x: { type: "spring", stiffness: 300, damping: 30 },
                            opacity: { duration: 0.2 },
                        }}
                        className="absolute w-full h-full flex flex-col items-center"
                    >
                        {currentStepContent.animation ? (
                            <div className="w-full max-w-5xl pl-3 flex-grow overflow-y-auto pb-12">
                                <h2 className="text-xl max-md:text-base text-left font-bold text-cyan-400 mb-4">
                                    {currentStepContent.title}
                                </h2>
                                <div className="w-full h-64 md:h-96 relative mb-6">
                                    <LottieAnimation
                                        animationData={currentStepContent.animation}
                                        className="w-full h-full"
                                    />
                                </div>
                                <p className="text-white/90 text-left text-lg max-md:text-base leading-relaxed">
                                    {currentStepContent.description}
                                </p>
                            </div>
                        ) : (
                            <div className="w-full max-w-5xl px-4 flex-grow overflow-y-auto pb-12">
                                <div className="relative w-full aspect-video mb-8 rounded-lg overflow-hidden">
                                    <Image
                                        src={currentStepContent.image}
                                        alt="Analysis"
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                                <div className="text-xl md:text-2xl text-white/90 leading-relaxed">
                                    {currentStepContent.summaryParts.map((part: any, index: number) => (
                                        <span
                                            key={index}
                                            className={part.highlight ? "text-cyan-400 font-bold" : ""}
                                        >
                                            {part.text}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>

            <div className="fixed bottom-0 left-0 right-0 z-20 bg-[#121212]/80 backdrop-blur-sm">
                <div className="max-w-5xl mx-auto p-4">
                    <Button
                        onClick={handleAnalysisNext}
                        className="w-full bg-white text-slate-900 hover:bg-slate-200 py-4 text-lg font-semibold rounded-sm shadow-lg transition-transform transform active:scale-95"
                    >
                        {isLastStep ? "Tiếp tục" : "Tiếp theo"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
