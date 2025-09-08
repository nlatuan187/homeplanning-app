/**
 * Step3_Spending.tsx
 *
 * Renders the third step: "Tình hình chi tiêu và tích luỹ".
 * Captures user's expenses, existing savings, and investment assumptions.
 * Provides dynamic feedback on monthly surplus and savings growth.
 */
"use client";

import { useState } from "react";
import { useFormContext } from "react-hook-form";
import { PlanFormState } from "../types";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { NumberInput } from "@/components/ui/number-input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";
import { AssumptionModal } from "../AssumptionModal";

export const Step3_Spending = () => {
  const { control, watch } = useFormContext<PlanFormState>();
  const [openModal, setOpenModal] = useState<string | null>(null);

  const pctExpenseGrowth = watch("pctExpenseGrowth");
  const pctInvestmentReturn = watch("pctInvestmentReturn");

  return (
    <>
      <Card className="bg-slate-900 border-slate-800 rounded-xl">
        <CardHeader>
          <CardTitle>3. Chi tiêu & Tích lũy</CardTitle>
          <CardDescription>
            Chúng tôi cần biết về chi tiêu và số tiền bạn đã tiết kiệm được.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <FormField
            control={control}
            name="monthlyLivingExpenses"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Chi tiêu sinh hoạt hàng tháng (triệu VNĐ)</FormLabel>
                <FormControl>
                  <NumberInput name={field.name} control={control} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="pctExpenseGrowth"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center">
                  Tốc độ tăng chi tiêu mỗi năm (%)
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-2 h-5 w-5"
                    onClick={() => setOpenModal("expenseGrowth")}
                  >
                    <Info className="h-4 w-4 text-cyan-500" />
                  </Button>
                </FormLabel>
                <FormControl>
                  <NumberInput name={field.name} control={control} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="initialSavings"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Số tiền tiết kiệm bạn đã có (triệu VNĐ)</FormLabel>
                <FormControl>
                  <NumberInput name={field.name} control={control} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="pctInvestmentReturn"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center">
                  Tỷ suất sinh lời từ đầu tư mỗi năm (%)
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-2 h-5 w-5"
                    onClick={() => setOpenModal("investmentReturn")}
                  >
                    <Info className="h-4 w-4 text-cyan-500" />
                  </Button>
                </FormLabel>
                <FormControl>
                  <NumberInput name={field.name} control={control} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="monthlyNonHousingDebt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Các khoản nợ khác phải trả hàng tháng (nếu có)
                </FormLabel>
                <FormControl>
                  <NumberInput name={field.name} control={control} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="currentAnnualInsurancePremium"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Chi phí hàng năm bạn trả cho Bảo hiểm Nhân thọ (triệu VNĐ)
                </FormLabel>
                <FormControl>
                  <NumberInput name={field.name} control={control} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>
      <AssumptionModal
        isOpen={openModal === "expenseGrowth"}
        onClose={() => setOpenModal(null)}
        title="Tốc độ tăng chi tiêu mỗi năm"
        currentValue={`${pctExpenseGrowth}%`}
        explanation="Dù bạn không tăng mức sống, thì chi phí sinh hoạt vẫn sẽ tăng theo lạm phát. 4% là mức gần với tốc độ lạm phát của Việt Nam."
        onConfirm={() => {}}
      />
      <AssumptionModal
        isOpen={openModal === "investmentReturn"}
        onClose={() => setOpenModal(null)}
        title="Tỷ suất sinh lời từ đầu tư"
        currentValue={`${pctInvestmentReturn}%`}
        explanation="Tốc độ tăng giá nhà trung bình là 10%/năm, vì vậy bạn cần đầu tư với tỷ suất sinh lời phù hợp để việc mua nhà không càng xa."
        onConfirm={() => {}}
      />
    </>
  );
}; 