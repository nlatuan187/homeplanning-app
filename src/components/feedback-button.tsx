"use client";

import { useState } from "react";
import { MessageSquarePlus, Calendar, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function FeedbackButton() {
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!feedback.trim()) return;
    
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: feedback }),
      });
      
      if (response.ok) {
        setFeedback("");
        setShowSuccess(true);
        
        // Close the sheet after showing success message briefly
        setTimeout(() => {
          setShowSuccess(false);
          setIsOpen(false);
        }, 1500);
      }
    } catch (error) {
      console.error("Failed to submit feedback:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-40">
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center gap-2">
          {!isOpen && (
            <div className="bg-primary text-primary-foreground rounded-md px-3 py-1.5 text-sm shadow-md max-md:hidden">
              Gửi phản hồi
            </div>
          )}
          <SheetTrigger asChild>
            <Button 
              size="icon" 
              className="rounded-full h-12 w-12 shadow-lg max-md:h-9 max-md:w-9"
            >
              <MessageSquarePlus className="h-6 w-6" />
              <span className="sr-only">Gửi phản hồi</span>
            </Button>
          </SheetTrigger>
        </div>
        
        <SheetContent side="right" className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Gửi phản hồi</SheetTitle>
            <SheetDescription>
              Hãy chia sẻ ý kiến của bạn để chúng tôi có thể cải thiện ứng dụng.
            </SheetDescription>
          </SheetHeader>
          
          {showSuccess ? (
            <div className="py-4 flex flex-col items-center justify-center space-y-2">
              <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-3">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-6 w-6 text-green-600 dark:text-green-400" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-center font-medium">Cảm ơn bạn đã gửi phản hồi!</p>
              <p className="text-center text-sm text-muted-foreground">Chúng tôi sẽ xem xét ý kiến của bạn.</p>
            </div>
          ) : (
            <>
              <div className="py-4">
                <Textarea
                  placeholder="Nhập phản hồi của bạn ở đây..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="min-h-[150px]"
                />
              </div>
              
              <SheetFooter className="pb-6">
                <Button 
                  onClick={handleSubmit} 
                  disabled={!feedback.trim() || isSubmitting}
                  className="w-full flex items-center justify-center gap-2"
                >
                  {isSubmitting ? "Đang gửi..." : "Gửi phản hồi"}
                  {!isSubmitting && <ArrowRight className="h-4 w-4" />}
                </Button>
              </SheetFooter>
            </>
          )}
          
          {/* Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Hoặc</span>
            </div>
          </div>
          
          <div className="pb-4">
            <h3 className="text-sm font-medium mb-2">Cần hỗ trợ trực tiếp?</h3>
            <Button 
              asChild 
              variant="outline" 
              className="w-full flex items-center justify-center gap-2"
            >
              <a 
                href="https://cal.com/tuan-nguyen-finful" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <Calendar className="h-4 w-4" />
                Đặt lịch nói chuyện với Tuấn
              </a>
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
