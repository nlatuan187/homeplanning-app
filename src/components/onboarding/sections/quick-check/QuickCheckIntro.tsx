"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useState } from "react";

interface QuickCheckIntroProps {
    onStart: () => void;
}

export default function QuickCheckIntro({ onStart }: QuickCheckIntroProps) {
    const router = useRouter();
    const { isSignedIn } = useAuth();
    const [introStep, setIntroStep] = useState(0);

    const introSlides = [
        {
            title: "Đánh giá tính khả thi",
            description:
                "Kiểm tra sức khỏe tài chính ở hiện tại và tương lai. Bạn sẽ biết xem có thể mua nhà mong muốn hay không, và có những cách nào để mua nhà dễ hơn, nhanh chóng hơn.",
            image: "/onboarding/intro-1.png",
        },
        {
            title: "Xây dựng kế hoạch cụ thể",
            description:
                "Biết sản phẩm phù hợp, số tiền đang có nên mua nhà nào, kênh tham khảo, ở đâu, tài chính, lộ trình và các yếu tố tài chính tự giải cho bài toán mua nhà 1 cách đúng đắn.",
            image: "/onboarding/intro-2.png",
        },
        {
            title: "Chuyên gia đứng về phía bạn",
            description:
                "Các chuyên gia tài chính và chuyên gia công nghệ luôn sẵn sàng để hỗ trợ. Chúng tôi tối ưu quyền lợi của bạn trên thị trường, đưa ra khuyến nghị phù hợp với khả năng và mong muốn của bạn.",
            image: "/onboarding/intro-3.png",
        },
    ];

    return (
        <>
            <style jsx global>{`
        .swiper-pagination-bullet {
          background-color: rgba(255, 255, 255, 255) !important;
          width: 24px !important;
          height: 4px !important;
          border-radius: 2px !important;
          opacity: 1 !important;
          transition: width 0.3s ease;
        }
        .swiper-pagination-bullet-active {
          background-color: #00ACB8 !important;
          width: 32px !important;
        }
      `}</style>
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
                            className="flex flex-col h-full"
                        >
                            <div className="flex flex-col h-full justify-between">
                                <div className="flex-grow flex items-center justify-center">
                                    <Image
                                        src={slide.image}
                                        alt={slide.title}
                                        width={250}
                                        height={250}
                                        className="object-contain"
                                    />
                                </div>

                                <div className="flex-shrink-0 px-2">
                                    <div className="mb-8">
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
                                onClick={onStart}
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
