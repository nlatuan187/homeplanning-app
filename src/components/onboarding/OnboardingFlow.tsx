"use client";

import { useState } from "react";
import { useRouter } from "next/navigation"; // Corrected import
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils"; // Assuming you have a cn utility

// Asset paths (assuming they will be in public/onboarding/)
const LOGO_PATH = "/onboarding/finful-logo.png";
const GRADIENT_A1_PATH = "/onboarding/gradient-onboarding-a1.png";
const APP_SNIPPET_A2_1_PATH = "/onboarding/app-snippet-a2-1.png";
const APP_SNIPPET_A2_2_PATH = "/onboarding/app-snippet-a2-2.png";
const APP_SNIPPET_A2_3_PATH = "/onboarding/app-snippet-a2-3.png";
const APP_SNIPPET_A3_PATH = "/onboarding/app-snippet-a3.png";
const LOCK_ICON_A4_PATH = "/onboarding/lock-icon-a4.png";
const GRADIENT_A4_PATH = "/onboarding/gradient-onboarding-a4.png";

const TOTAL_STEPS = 4;

export default function OnboardingFlow() {
  const [currentStep, setCurrentStep] = useState(1);
  const router = useRouter();

  const handleNext = () => {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleSignIn = () => {
    router.push("/sign-in");
  };

  const handleSignUp = () => {
    router.push("/sign-up");
  };

  const renderPaginationDots = () => {
    return (
      <div className="flex justify-center space-x-2.5 mt-6 mb-5 md:mt-8"> {/* Increased spacing for dots */}
        {Array.from({ length: TOTAL_STEPS }).map((_, index) => (
          <div
            key={index}
            className={cn(
              "h-2.5 w-2.5 rounded-full transition-all duration-300 ease-in-out",
              currentStep === index + 1 ? "bg-white scale-125" : "bg-slate-500 hover:bg-slate-400" // Adjusted inactive color
            )}
          />
        ))}
      </div>
    );
  };

  // StepWrapper ensures content within each step takes available space and centers.
  // Added padding for content within each step, distinct from page padding.
  const StepWrapper: React.FC<{children: React.ReactNode, className?: string, isGradientStep?: boolean}> = ({ children, className, isGradientStep }) => (
    <div className={cn(
        "flex-grow flex flex-col items-center w-full",
        isGradientStep ? "justify-center" : "justify-center py-6 md:py-10", // More padding for non-gradient steps
        className
      )}
    >
      {children}
    </div>
  );
  
  // GradientBox for steps 1 and 4. Ensures it takes full width of its container and has min height.
  const GradientBox: React.FC<{gradientPath: string, children: React.ReactNode, className?: string}> = ({ gradientPath, children, className}) => (
    <div 
      className={cn(
        "relative w-full h-full min-h-[75vh] sm:min-h-[65vh] md:min-h-[70vh] text-center p-6 sm:p-8 md:p-12 rounded-xl flex flex-col items-center justify-center bg-cover bg-center shadow-2xl", // Added shadow
        className
      )} 
      style={{ backgroundImage: `url(${gradientPath})` }}
    >
      <div className="absolute inset-0 bg-black/40 rounded-xl"></div> {/* Darker overlay for better contrast */}
      <div className="relative z-10 space-y-5 md:space-y-6 flex flex-col items-center"> {/* Added flex to center children */}
        {children}
      </div>
    </div>
  );

  return (
    // Main container for the entire onboarding flow
    <div className="flex flex-col items-center min-h-screen bg-slate-950 text-white p-4 sm:p-6">
      {/* Content container with responsive max-width and flex structure */}
      {/* Added h-full and flex-1 to ensure it tries to fill parent's height. Parent is min-h-screen flex flex-col. */}
      <div className="w-full max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl flex flex-col h-full flex-1"> 
        
        {/* Scrollable dynamic content area for each step */}
        <div className="flex-grow overflow-y-auto pb-28"> {/* Reduced bottom padding from pb-32 to pb-28 */}
          {currentStep === 1 && (
            <StepWrapper isGradientStep>
              <GradientBox gradientPath={GRADIENT_A1_PATH}>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight">Chào mừng bạn <br className="sm:hidden"/>đến với Finful!</h1>
              <p className="text-slate-100 text-sm sm:text-base md:text-lg leading-relaxed max-w-md">
                Finful là một startup mong muốn giúp đỡ mọi người đạt được mục tiêu tài chính.
              </p>
              <p className="text-slate-100 text-sm sm:text-base md:text-lg leading-relaxed max-w-md">
                <strong className="font-semibold">“Chinh phục căn nhà đầu tiên”</strong> là công cụ chúng tôi thiết kế để giúp mọi người xây dựng kế hoạch mua nhà dựa trên khả năng tài chính của mình.
              </p>
              <p className="text-slate-100 text-sm sm:text-base md:text-lg leading-relaxed max-w-md">
                Để hiểu hơn về Finful và công cụ, bạn có thể truy cập website của chúng tôi:
              </p>
              <Link href="https://www.finful.co/" target="_blank" rel="noopener noreferrer" className="inline-block mt-3">
                <Image src={LOGO_PATH} alt="Finful Logo" width={150} height={50} priority className="transition-transform hover:scale-105 h-auto"/>
              </Link>
              </GradientBox>
            </StepWrapper>
          )}

          {currentStep === 2 && (
            <StepWrapper className="py-6 md:py-10"> {/* StepWrapper already has justify-center */}
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-8 md:mb-12">Bạn sẽ được giải đáp</h1>
            <div className="space-y-8 md:space-y-12 w-full">
              {[
                { img: APP_SNIPPET_A2_1_PATH, text: "Mình có mua được nhà như mong muốn hay không? Đâu mới là thời điểm tối ưu nhất để mua nhà?" },
                { img: APP_SNIPPET_A2_2_PATH, text: "Mình có thể trả được nợ sau khi mua nhà hay không?" },
                { img: APP_SNIPPET_A2_3_PATH, text: "Cụ thể từng bước chinh phục căn nhà mơ ước là gì?" },
              ].map((item, index) => (
                <div key={index} className="md:flex md:items-center md:space-x-6 text-center md:text-left">
                  <div className="mb-4 md:mb-0 md:w-2/5 flex-shrink-0">
                    <Image src={item.img} alt={`App Snippet ${index + 1}`} width={320} height={180} className="mx-auto md:mx-0 rounded-lg shadow-xl w-full max-w-[280px] sm:max-w-xs md:max-w-none h-auto"/>
                  </div>
                  <p className="text-slate-200 text-sm sm:text-base md:text-lg leading-relaxed md:w-3/5">{item.text}</p>
                </div>
              ))}
            </div>
          </StepWrapper>
        )}

        {currentStep === 3 && (
          <StepWrapper className="py-6 md:py-10">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-8 md:mb-12">Chỉ cần 5 phút với 1 bước duy nhất</h1>
            <div className="w-full max-w-[280px] sm:max-w-xs md:max-w-sm mx-auto">
              <Image src={APP_SNIPPET_A3_PATH} alt="App Snippet A3" width={375} height={600} className="rounded-xl shadow-2xl w-full h-auto"/>
            </div>
            <p className="text-slate-200 text-sm sm:text-base md:text-lg leading-relaxed text-center mt-8 md:mt-10 max-w-md mx-auto">
              Trả lời các câu hỏi về nhu cầu mua nhà và tình hình tài chính của bản thân
            </p>
          </StepWrapper>
        )}

        {currentStep === 4 && (
          <StepWrapper isGradientStep>
             <GradientBox gradientPath={GRADIENT_A4_PATH}>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight">Chúng tôi cam kết bảo mật thông tin của bạn</h1>
              <Image src={LOCK_ICON_A4_PATH} alt="Security Lock Icon" width={72} height={72} className="my-5 md:my-8 h-auto"/>
              <p className="text-slate-100 text-sm sm:text-base md:text-lg leading-relaxed max-w-sm md:max-w-md mx-auto">
                Chúng tôi thu thập thông tin về tình hình tài chính nhằm mục đích duy nhất là phân tích và xây dựng kế hoạch phù hợp với bạn nhất. Mọi thông tin bạn cung cấp sẽ được bảo mật.
              </p>
              </GradientBox>
            </StepWrapper>
          )}
        </div> {/* End of scrollable content area */}
        
        {/* Sticky Bottom Controls */}
        <div className="sticky bottom-0 left-0 right-0 w-full py-4 md:py-5 border-t border-slate-700/50 bg-slate-950 z-10"> {/* Made sticky */}
          {renderPaginationDots()}
          {currentStep < TOTAL_STEPS && (
            <Button onClick={handleNext} className="w-full bg-white text-slate-900 hover:bg-slate-200 py-3.5 text-base md:text-lg font-semibold rounded-xl shadow-md">
              Tiếp tục
            </Button>
          )}
          {currentStep === TOTAL_STEPS && (
            <div className="space-y-3">
              <Button onClick={handleSignIn} className="w-full bg-white text-slate-900 hover:bg-slate-200 py-3 text-base md:text-lg font-semibold rounded-lg">
                Đăng nhập
              </Button>
              <Button onClick={handleSignUp} variant="outline" className="w-full border-white text-white hover:bg-slate-800 hover:text-white py-3 text-base md:text-lg font-semibold rounded-lg">
                Đăng ký
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
