"use client"; // Required for useState and client-side interactions

import { useState, useEffect } from "react"; // Added useEffect
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { UserButton, useUser } from "@clerk/nextjs"; // useUser for client-side user data
// import { currentUser } from "@clerk/nextjs/server"; // No longer needed for main component
// import { db } from "@/lib/db"; // Removed, db access moved to server action
import { Plan } from "@prisma/client"; // Keep Plan if ExtendedPlan relies on it, or remove if ExtendedPlan is imported
import Link from "next/link";
import { redirect } from "next/navigation"; 
import { getPlansForUser } from "@/actions/dashboardActions"; // Import server action
import { MessageSquareText, Home, DollarSign, CheckCircle2, XCircle, ArrowRight, CalendarDays, ExternalLink } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  // SheetFooter, // Removed as not used in SupportSheetContent
  SheetHeader,
  SheetTitle,
  // SheetTrigger, // Removed as not used globally
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";

// Extended Plan type - this can be removed if `getPlansForUser` return type is sufficient
// or if we import ExtendedPlan from dashboardActions.ts (if exported there)
// For now, let's assume the return type of getPlansForUser is specific enough.
// If TypeScript complains about `plans` state, we might need to import/define ExtendedPlan.
type ExtendedPlan = Plan & { // Keeping for now, as it's used for useState<ExtendedPlan[]>
  buffer?: number;
  userEmail?: string;
  revisionHistory?: Record<string, unknown>;
};

// Support Sheet Content Component
const SupportSheetContent = () => {
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(true); // To control internal close

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
          setIsSheetOpen(false); // This will trigger onOpenChange in parent
        }, 2000);
      } else {
        // Handle error display if needed
        console.error("Failed to submit feedback");
      }
    } catch (error) {
      console.error("Failed to submit feedback:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isSheetOpen) return null; // Allows parent to control visibility via prop too

  return (
    <>
      <SheetHeader className="pb-2">
        <SheetTitle>Trò chuyện sâu về Kế hoạch Mua nhà & Finful</SheetTitle>
        <SheetDescription>
          Cảm ơn bạn đã sẵn sàng chia sẻ! Cuộc trò chuyện này rất quan trọng để Finful hiểu rõ hơn về những điểm sau:
        </SheetDescription>
        {/* Moved UL and subsequent text out of SheetDescription */}
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


export default function Dashboard() {
  const { user, isLoaded } = useUser();
  // const router = useRouter(); // Removed as not used
  const [plans, setPlans] = useState<ExtendedPlan[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [isSupportSheetOpen, setIsSupportSheetOpen] = useState(false);

  const addUserToDB = async () => {
    if (user) {
      await fetch("/api/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: user.id,
          email: user.primaryEmailAddress?.emailAddress,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        }),
      });
    }
  };

  useEffect(() => {
    if (isLoaded && !user) {
      redirect("/sign-in");
    }
    addUserToDB();
    if (user) {
      getPlansForUser(user.id).then(fetchedPlans => {
        setPlans(fetchedPlans);
        setIsLoadingPlans(false);
      });
    }
  }, [user, isLoaded]);

  if (!isLoaded || isLoadingPlans) {
    return ( // Basic loading state
      <main className="min-h-screen bg-slate-950 p-4 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </main>
    );
  }
  
  const currentYear = new Date().getFullYear();

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
        <p className="text-slate-400 text-sm leading-relaxed">
          Bạn đang nghiêm túc với kế hoạch mua nhà và đã dùng Finful? Chúng tôi rất muốn lắng nghe hành trình, trăn trở của bạn và cách Finful có thể đồng hành tốt hơn. Những chia sẻ sâu sắc sẽ giúp chúng tôi phát triển sản phẩm thực sự giá trị. Dành thời gian trò chuyện và nhận ngay <strong>100.000 VNĐ</strong> như một lời cảm ơn!
        </p>
      </CardContent>
    </Card>
  );

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <header className="container mx-auto max-w-5xl px-4 pt-8 py-6 flex justify-between items-center sticky top-0 bg-slate-950 z-40 border-b border-slate-800"> {/* Increased py-4 to py-6 */}
        <div className="text-2xl font-bold">Lập kế hoạch mua nhà</div> {/* Increased text-xl to text-2xl */}
        <UserButton afterSignOutUrl="/" />
      </header>

      <div className="container mx-auto max-w-5xl p-4 pt-6 space-y-8"> {/* Changed max-w-3xl to max-w-5xl */}
        {/* Top Section with Gradient */}
        <div 
          className="bg-cover bg-center rounded-xl p-px" // p-px for border effect if needed
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
            <Button asChild size="lg" className="bg-white text-slate-900 hover:bg-slate-200 font-semibold">
              <Link href="/plan/new">Tạo kế hoạch mới <ArrowRight className="ml-2 h-5 w-5" /></Link>
            </Button>
          </div>
        </div>

        {plans.length === 0 && !isLoadingPlans && (
          <SupportCard />
        )}

        {plans.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-100">Các kế hoạch đã tạo</h2>
            <div className="space-y-4">
              {plans.map((plan, index) => {
                const targetYear = currentYear + plan.yearsToPurchase;
                let detailLink = `/plan/${plan.id}/results`;
                if (plan.affordabilityOutcome === "ScenarioB" && plan.confirmedPurchaseYear && plan.reportGeneratedAt) {
                  detailLink = `/plan/${plan.id}/report`;
                }
                const isViable = (plan.affordabilityOutcome === "ScenarioA" && (plan.buffer ?? 0) >= 0) || 
                                 (plan.affordabilityOutcome === "ScenarioB" && !!plan.firstViableYear);

                return (
                  <Card key={plan.id} className="bg-slate-900 border-slate-800"> {/* Changed background and border */}
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg text-slate-50">
                            {plan.planName || `Kế hoạch ${plans.length - index}`} - Mua nhà năm {targetYear}
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
                        <span>Giá trị căn nhà: {plan.targetHousePriceN0.toLocaleString()} tỷ VNĐ</span>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button asChild variant="outline" className="w-full border-slate-600 hover:bg-slate-700 text-slate-200">
                        <Link href={detailLink}>Xem chi tiết</Link>
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
        
        {plans.length > 0 && <SupportCard />}
      </div>
      <Sheet open={isSupportSheetOpen} onOpenChange={setIsSupportSheetOpen}>
        <SheetContent side="right" className="bg-slate-900 text-slate-100 border-slate-700 sm:max-w-lg">
          <SupportSheetContent />
        </SheetContent>
      </Sheet>
    </main>
  );
}
