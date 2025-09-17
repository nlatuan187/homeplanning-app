"use client"; 

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { PlanForDashboard } from "@/actions/dashboardActions";
import { MessageSquareText, Home, DollarSign, CheckCircle2, XCircle, ArrowRight, CalendarDays, ExternalLink } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import BottomNavbar from "@/components/layout/BottomNavbar";
import PendingPlanHandler from "@/components/PendingPlanHandler";
import OnboardingProgressDisplay from "./OnboardingProgress";
import { OnboardingProgress } from "@prisma/client"; // IMPORT HÀM MỚI

// Support Sheet Content Component
const SupportSheetContent = () => {
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(true);

  const handleSubmitFeedback = async () => {
    if (!feedback.trim()) return;
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: feedback }),
      });
      if (response.ok) {
        setFeedback("");
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
          setIsSheetOpen(false);
        }, 2000);
      } else {
        console.error("Failed to submit feedback");
      }
    } catch (error) {
      console.error("Failed to submit feedback:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isSheetOpen) return null;

  return (
    <>
      <SheetHeader className="pb-2">
        <SheetTitle>Trò chuyện sâu về Kế hoạch Mua nhà & Finful</SheetTitle>
        <SheetDescription>
          Cảm ơn bạn đã sẵn sàng chia sẻ! Cuộc trò chuyện này rất quan trọng để Finful hiểu rõ hơn về những điểm sau:
        </SheetDescription>
        <div className="text-sm text-muted-foreground mt-2 space-y-2">
          <ul className="list-disc list-inside space-y-1 text-slate-300 pl-2">
            <li><strong className="font-medium text-slate-100">Vấn đề cốt lõi:</strong> Kế hoạch mua nhà có phải là điều bạn thực sự trăn trở và muốn giải quyết?</li>
            <li><strong className="font-medium text-slate-100">Giá trị của Finful:</strong> Công cụ này đã giúp bạn làm rõ điều gì, hay tạo động lực ra sao trong việc mua nhà?</li>
            <li><strong className="font-medium text-slate-100">Trải nghiệm sản phẩm:</strong> Có điểm nào trong Finful khiến bạn thấy dễ dùng, hay còn bối rối, cần cải thiện?</li>
            <li><strong className="font-medium text-slate-100">Mong muốn tương lai:</strong> Nếu Finful có thể làm thêm một điều gì đó cho kế hoạch tài chính của bạn, đó sẽ là gì?</li>
          </ul>
            <p>
            Để cảm ơn thời gian và những đóng góp giá trị của bạn, Finful xin gửi tặng <strong>100.000 VNĐ</strong> sau cuộc trò chuyện.
            Vui lòng đặt lịch hẹn với Tuấn qua Cal.com bên dưới.
            </p>
          <p>
            Nếu bạn chưa tiện trò chuyện, cũng có thể để lại những suy nghĩ ban đầu của mình vào khung bên dưới.
          </p>
        </div>
      </SheetHeader>
      {showSuccess ? (
        <div className="py-8 flex flex-col items-center justify-center space-y-3">
          <CheckCircle2 className="h-12 w-12 text-green-500" />
          <p className="text-center font-medium text-lg">Cảm ơn bạn đã gửi phản hồi!</p>
          <p className="text-center text-sm text-muted-foreground">Chúng tôi sẽ xem xét ý kiến của bạn.</p>
        </div>
      ) : (
        <>
          <div className="py-4">
            <Textarea
              placeholder="Chia sẻ ban đầu của bạn về trải nghiệm lập kế hoạch mua nhà với Finful..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="min-h-[120px] bg-slate-800 border-slate-700 text-slate-50 placeholder-slate-400"
            />
          </div>
          <Button
            onClick={handleSubmitFeedback}
            disabled={!feedback.trim() || isSubmitting}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {isSubmitting ? "Đang gửi..." : "Gửi chia sẻ nhanh"}
            {!isSubmitting && <ArrowRight className="h-4 w-4 ml-2" />}
          </Button>
        </>
      )}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-700"></div>
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-slate-900 px-2 text-slate-400">Hoặc</span>
        </div>
      </div>
      <Button
        asChild
        variant="outline"
        className="w-full border-slate-700 hover:bg-slate-800 text-slate-200"
      >
        <a
          href="https://cal.com/tuan-nguyen-finful"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2"
        >
          <CalendarDays className="h-4 w-4" />
          Đặt lịch trò chuyện sâu (nhận 100k tri ân)
          <ExternalLink className="h-3 w-3 text-slate-500" />
        </a>
      </Button>
    </>
  );
};

interface DashboardClientProps {
    initialPlan: PlanForDashboard | null;
    initialProgress: OnboardingProgress | null;
}

export default function DashboardClient({ initialPlan, initialProgress }: DashboardClientProps) {
  const { user } = useUser();
  const [plan] = useState<PlanForDashboard | null>(initialPlan);
  const [isSupportSheetOpen, setIsSupportSheetOpen] = useState(false);
  const targetHousePrice = ((plan?.targetHousePriceN0 || 0) * Math.pow(1 + (plan?.pctHouseGrowth || 0) / 100, (plan?.confirmedPurchaseYear || 0) - new Date().getFullYear()))/ 1000;
  console.log("plan?.pctHouseGrowth", plan);
  console.log("targetHousePrice", targetHousePrice);

  const SupportCard = () => (
    <Card 
      className="bg-slate-800 border-slate-700 hover:bg-slate-700/50 transition-colors cursor-pointer"
      onClick={() => setIsSupportSheetOpen(true)}
    >
      <CardHeader className="flex flex-row items-center space-x-3 pb-3">
        <div className="p-2 bg-blue-500/20 rounded-full">
          <MessageSquareText className="h-6 w-6 text-blue-400" />
        </div>
        <CardTitle className="text-slate-100 text-lg">Trò chuyện về kế hoạch mua nhà của bạn?</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-slate-400 text-xs leading-relaxed">
          Bạn đang nghiêm túc với kế hoạch mua nhà và đã dùng Finful? Chúng tôi rất muốn lắng nghe hành trình, trăn trở của bạn và cách Finful có thể đồng hành tốt hơn. Những chia sẻ sâu sắc sẽ giúp chúng tôi phát triển sản phẩm thực sự giá trị. Dành thời gian trò chuyện và nhận ngay <strong>100.000 VNĐ</strong> như một lời cảm ơn!
        </p>
      </CardContent>
    </Card>
  );

  if (initialProgress) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100">
        <header className="container mx-auto max-w-5xl px-4 pt-8 py-6 flex justify-between items-center sticky top-0 bg-slate-950 z-40 border-b border-slate-800">
          <div className="text-2xl font-bold">Xin chào, {user?.firstName || "Bạn"}!</div>
          <UserButton afterSignOutUrl="/" />
        </header>
        <div className="container mx-auto max-w-5xl p-4 pt-6 space-y-8">
          <OnboardingProgressDisplay planId={initialPlan?.id || ""} progress={initialProgress} />
          <SupportCard />
        </div>
        <Sheet open={isSupportSheetOpen} onOpenChange={setIsSupportSheetOpen}>
          <SheetContent side="right" className="bg-slate-900 text-slate-100 border-slate-700 sm:max-w-lg">
            <SupportSheetContent />
          </SheetContent>
        </Sheet>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 pb-20">
      <header className="container mx-auto max-w-5xl px-4 pt-8 py-6 flex justify-between items-center sticky top-0 bg-slate-950 z-40 border-b border-slate-800">
        <div className="text-2xl font-bold">Lập kế hoạch mua nhà</div>
        <UserButton afterSignOutUrl="/" />
      </header>

      <div className="container mx-auto max-w-5xl p-4 pt-6 space-y-8">
        <div 
          className="bg-cover bg-center rounded-xl p-px"
          style={{ backgroundImage: 'url(/gradient_dashboard.png)' }}
        >
          <div className="bg-slate-900/70 backdrop-blur-sm p-6 rounded-xl space-y-3">
            <h1 className="text-2xl font-semibold text-white">
              Xin chào, {user?.firstName || "Bạn"}!
            </h1>
            <h2 className="text-3xl font-bold text-white">Chinh phục căn nhà mơ ước</h2>
            <p className="text-slate-300">
              Thiết kế kế hoạch tài chính tổng thể để tìm ra thời điểm mua nhà hợp lý, đồng thời tối ưu số tiền bạn đang có.
            </p>
            {!plan && (
              <Button asChild size="lg" className="bg-white text-slate-900 hover:bg-slate-200 font-semibold">
                <Link href="/plan/new">Tạo kế hoạch mới <ArrowRight className="ml-2 h-5 w-5" /></Link>
              </Button>
            )}
          </div>
        </div>

        {!plan && (
          <SupportCard />
        )}

        {plan && (
          <div className="space-y-8">            
            <h2 className="text-2xl font-bold text-slate-100">Kế hoạch của bạn</h2>
            <div className="space-y-4">
              {(() => {
                const targetYear = plan.confirmedPurchaseYear;
                const isViable = (plan.affordabilityOutcome === "ScenarioB" && plan.confirmedPurchaseYear);
                const detailLink = isViable
                  ? `/plan/${plan.id}/report`
                  : `/plan/${plan.id}/results`;

                return (
                  <Card key={plan.id} className="bg-slate-900 border-slate-800">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg text-slate-50">
                            {plan.planName || `Kế hoạch mua nhà`} - Mua nhà năm {targetYear}
                          </CardTitle>
                          <CardDescription className="text-xs text-slate-400">
                            Tạo ngày: {new Date(plan.createdAt).toLocaleDateString("vi-VN")}
                          </CardDescription>
                        </div>
                        {isViable ? (
                          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-green-500/20 text-green-300 text-xs font-medium">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Có khả thi</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-red-500/20 text-red-300 text-xs font-medium">
                            <XCircle className="h-3.5 w-3.5" />
                            <span>Chưa khả thi</span>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="text-sm text-slate-300 space-y-1.5 pt-2 pb-4">
                      <div className="flex items-center">
                        <Home className="h-4 w-4 mr-2 text-slate-400" /> 
                        <span>{plan.targetHouseType} tại {plan.targetLocation}</span>
                      </div>
                      <div className="flex items-center">
                        <DollarSign className="h-4 w-4 mr-2 text-slate-400" />
                        <span>Giá trị căn nhà: {targetHousePrice.toLocaleString()} tỷ VNĐ</span>
                      </div>
                    </CardContent>
                    <CardFooter className="gap-4">
                      <Button asChild variant="outline" className="flex-1 border-slate-600 hover:bg-slate-700 text-slate-200">
                        <Link href={detailLink}>Xem chi tiết</Link>
                      </Button>
                      <Button asChild variant="outline" className="flex-1 border-slate-600 hover:bg-slate-700 text-slate-200">
                        <Link href={`/plan/${plan.id}/edit`}>Chỉnh sửa kế hoạch</Link>
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })()}
            </div>
          </div>
        )}
        
        {plan && <SupportCard />}
      </div>
      <Sheet open={isSupportSheetOpen} onOpenChange={setIsSupportSheetOpen}>
        <SheetContent side="right" className="bg-slate-900 text-slate-100 border-slate-700 sm:max-w-lg">
          <SupportSheetContent />
        </SheetContent>
      </Sheet>
      <PendingPlanHandler />
      {plan && <BottomNavbar planId={plan.id}/>}
    </main>
  );
}