/**
 * Step2_Income.tsx
 *
 * Renders the second step of the form: "Tình hình thu nhập".
 * It captures income details for the user and a potential co-applicant,
 * including salary growth assumptions.
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
import { Switch } from "@/components/ui/switch";
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

export const Step2_Income = () => {
  const { control, watch } = useFormContext<PlanFormState>();
  const [openModal, setOpenModal] = useState<string | null>(null);
  const hasCoApplicant = watch("hasCoApplicant");
  const pctSalaryGrowth = watch("pctSalaryGrowth");
  const coApplicantSalaryGrowth = watch("coApplicantSalaryGrowth");

  return (
    <>
      <Card className="bg-slate-900 border-slate-800 rounded-xl">
        <CardHeader>
          <CardTitle>2. Thu nhập của bạn</CardTitle>
          <CardDescription>
            Thông tin này giúp chúng tôi biết được khả năng tài chính của bạn.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <FormField
            control={control}
            name="userMonthlyIncome"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Thu nhập hàng tháng của bạn (triệu VNĐ)</FormLabel>
                <FormControl>
                  <NumberInput name={field.name} control={control} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="pctSalaryGrowth"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center">
                  Tốc độ tăng lương mỗi năm (%)
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-2 h-5 w-5"
                    onClick={() => setOpenModal("salaryGrowth")}
                  >
                    <Info className="h-4 w-4 text-cyan-400" />
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
            name="hasCoApplicant"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border border-gray-600 p-4">
                <div className="space-y-0.5">
                  <FormLabel>
                    Bạn có người đồng hành (vợ/chồng) không?
                  </FormLabel>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {hasCoApplicant && (
            <div className="space-y-6 rounded-lg border border-gray-600 p-4">
              <FormField
                control={control}
                name="coApplicantMonthlyIncome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Thu nhập hàng tháng của vợ/chồng (triệu VNĐ)
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
                name="coApplicantSalaryGrowth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center">
                      Tốc độ tăng lương vợ/chồng (%)
                       <Button
                        variant="ghost"
                        size="icon"
                        className="ml-2 h-5 w-5"
                        onClick={() => setOpenModal("coApplicantSalaryGrowth")}
                      >
                        <Info className="h-4 w-4 text-cyan-400" />
                      </Button>
                    </FormLabel>
                    <FormControl>
                      <NumberInput name={field.name} control={control} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          <FormField
            control={control}
            name="monthlyOtherIncome"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Thu nhập khác hàng tháng (nếu có)</FormLabel>
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
        isOpen={openModal === "salaryGrowth"}
        onClose={() => setOpenModal(null)}
        title="Tốc độ tăng lương mỗi năm"
        currentValue={`${pctSalaryGrowth}%`}
        explanation="Tiền lương là khoản đóng góp rất lớn vào tích lũy hàng năm, vì vậy lương cần tăng để bắt kịp tốc độ tăng giá nhà. 7% cũng được xác định dựa trên mức tăng lương trung bình của người lao động Việt Nam."
        onConfirm={() => {}}
      />
       <AssumptionModal
        isOpen={openModal === "coApplicantSalaryGrowth"}
        onClose={() => setOpenModal(null)}
        title="Tốc độ tăng lương vợ/chồng"
        currentValue={`${coApplicantSalaryGrowth}%`}
        explanation="Giả định này giúp tính toán sự tăng trưởng thu nhập của người đồng hành, ảnh hưởng trực tiếp đến khả năng tài chính chung của gia đình."
        onConfirm={() => {}}
      />
    </>
  );
}; 