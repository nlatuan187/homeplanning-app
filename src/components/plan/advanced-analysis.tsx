"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ComparisonData } from "@/lib/calculations/affordability";
import { Plan } from "@prisma/client";
import { getComparisonData } from "@/actions";

interface AdvancedAnalysisProps {
  plan: Plan;
  comparisonData: ComparisonData;
  targetYear: number;
}

export default function AdvancedAnalysis({ plan, comparisonData, targetYear }: AdvancedAnalysisProps) {
  const [intermediateAnalysis, setIntermediateAnalysis] = useState<string | null>(null);
  const [finalReport, setFinalReport] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState<string>("");
  const [showFinalReport, setShowFinalReport] = useState(false);

  // Loading steps for simulated thinking
  const loadingSteps = [
    "Đang phân tích mục tiêu và dòng tiền của bạn...",
    "Đánh giá hiệu quả tiết kiệm & đầu tư...",
    "Xem xét cấu trúc vốn và khả năng vay...",
    "Kiểm tra phương án quản trị rủi ro...",
    "Tổng hợp kế hoạch chi tiết...",
    "Hoàn thiện báo cáo..."
  ];

  // Function to fetch intermediate analysis using the server action
  const fetchIntermediateAnalysis = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Use the getComparisonData server action
      const result = await getComparisonData(plan.id);
      
      if (!result.success) {
        throw new Error(result.error || "Failed to fetch analysis");
      }
      
      setIntermediateAnalysis(result.aiAnalysis);
    } catch (err) {
      console.error("Error fetching analysis:", err);
      setError("Không thể tạo phân tích chi tiết. Vui lòng thử lại sau.");
    } finally {
      setIsLoading(false);
    }
  };

  // Function to fetch final report
  const fetchFinalReport = async () => {
    if (!plan.confirmedPurchaseYear) {
      setError("Vui lòng xác nhận năm mua nhà trước khi tạo báo cáo chi tiết.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setShowFinalReport(true);

    // Start the simulated thinking steps
    let stepIndex = 0;
    setLoadingStep(loadingSteps[stepIndex]);

    const stepInterval = setInterval(() => {
      stepIndex = (stepIndex + 1) % loadingSteps.length;
      setLoadingStep(loadingSteps[stepIndex]);
    }, 10000); // Update every 5 seconds

    try {
      // This would be replaced with a call to the generateFinalReport server action
      // For now, we'll simulate it with a timeout
      setTimeout(() => {
        setFinalReport(`# Báo cáo chi tiết cho năm ${plan.confirmedPurchaseYear}

## Hiệu quả Danh mục Tài sản
...

## Quản lý Dòng tiền
...

## Quản trị Rủi ro
...

## Lộ trình & Cột mốc
...

## Khuyến nghị & Bước tiếp theo
...`);
        
        clearInterval(stepInterval);
        setIsLoading(false);
      }, 10000);
    } catch (err) {
      console.error("Error fetching final report:", err);
      setError("Không thể tạo báo cáo chi tiết. Vui lòng thử lại sau.");
      clearInterval(stepInterval);
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Phân tích chi tiết</CardTitle>
          <CardDescription>
            Sử dụng AI để phân tích chi tiết các lựa chọn của bạn
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!intermediateAnalysis && !isLoading && !error && (
            <div className="text-center py-6">
              <p className="text-slate-400 mb-4">
                Nhận phân tích chi tiết từ AI về các lựa chọn mua nhà của bạn, bao gồm rủi ro tài chính, xu hướng thị trường và các khuyến nghị cá nhân.
              </p>
              <Button onClick={fetchIntermediateAnalysis}>
                Tạo phân tích chi tiết
              </Button>
            </div>
          )}

          {isLoading && !showFinalReport && (
            <div className="text-center py-6">
              <p className="text-slate-400 mb-4">Đang tạo phân tích chi tiết...</p>
              <div className="animate-pulse flex space-x-4">
                <div className="flex-1 space-y-4 py-1">
                  <div className="h-4 bg-slate-700 rounded w-3/4"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-slate-700 rounded"></div>
                    <div className="h-4 bg-slate-700 rounded w-5/6"></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {isLoading && showFinalReport && (
            <div className="text-center py-6">
              <p className="text-slate-400 mb-4">{loadingStep}</p>
              <div className="animate-pulse flex space-x-4">
                <div className="flex-1 space-y-4 py-1">
                  <div className="h-4 bg-slate-700 rounded w-3/4"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-slate-700 rounded"></div>
                    <div className="h-4 bg-slate-700 rounded w-5/6"></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="text-center py-6">
              <p className="text-red-400 mb-4">{error}</p>
              <Button onClick={fetchIntermediateAnalysis}>
                Thử lại
              </Button>
            </div>
          )}

          {intermediateAnalysis && !showFinalReport && (
            <div className="py-2">
              <div className="whitespace-pre-line text-sm mb-6">
                {intermediateAnalysis}
              </div>

              {plan.confirmedPurchaseYear && (
                <div className="mt-6 text-center">
                  <Button onClick={fetchFinalReport}>
                    Tạo báo cáo chi tiết cho năm {plan.confirmedPurchaseYear}
                  </Button>
                </div>
              )}
            </div>
          )}

          {finalReport && (
            <div className="py-2">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="report">
                  <AccordionTrigger>Xem báo cáo chi tiết</AccordionTrigger>
                  <AccordionContent>
                    <div className="whitespace-pre-line text-sm">
                      {finalReport}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
