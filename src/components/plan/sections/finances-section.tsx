"use client";

import { FormState } from "../plan-form";
import { NumberInput } from "@/components/ui/number-input";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Form } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { InfoIcon } from "lucide-react";

// Define the validation schema for this section
const financesSchema = z.object({
  initialSavingsGoal: z.coerce.number().nonnegative({
    message: "Số tiền tiết kiệm không được âm",
  }),
  incomeLastYear: z.coerce.number().positive({
    message: "Thu nhập phải là số dương",
  }),
  monthlyOtherIncome: z.coerce.number().nonnegative({
    message: "Thu nhập khác không được âm",
  }),
  monthlyLivingExpenses: z.coerce.number().positive({
    message: "Chi phí sinh hoạt phải là số dương",
  }),
  monthlyNonHousingDebt: z.coerce.number().nonnegative({
    message: "Khoản vay khác không được âm",
  }),
  currentAnnualInsurancePremium: z.coerce.number().nonnegative({
    message: "Phí bảo hiểm không được âm",
  }),
});

type FinancesSectionProps = {
  formState: FormState;
  setFormState: React.Dispatch<React.SetStateAction<FormState>>;
};

export default function FinancesSection({ formState, setFormState }: FinancesSectionProps) {
  // Initialize the form with react-hook-form
  const form = useForm<z.infer<typeof financesSchema>>({
    resolver: zodResolver(financesSchema),
    defaultValues: {
      initialSavingsGoal: formState.initialSavingsGoal,
      incomeLastYear: formState.incomeLastYear,
      monthlyOtherIncome: formState.monthlyOtherIncome,
      monthlyLivingExpenses: formState.monthlyLivingExpenses,
      monthlyNonHousingDebt: formState.monthlyNonHousingDebt,
      currentAnnualInsurancePremium: formState.currentAnnualInsurancePremium,
    },
  });

  // Watch specific form values instead of the entire form
  const initialSavingsGoal = form.watch("initialSavingsGoal");
  const incomeLastYear = form.watch("incomeLastYear");
  const monthlyOtherIncome = form.watch("monthlyOtherIncome");
  const monthlyLivingExpenses = form.watch("monthlyLivingExpenses");
  const monthlyNonHousingDebt = form.watch("monthlyNonHousingDebt");
  const currentAnnualInsurancePremium = form.watch("currentAnnualInsurancePremium");

  // Update the parent form state when specific form values change
  useEffect(() => {
    setFormState((prev) => ({
      ...prev,
      initialSavingsGoal,
      incomeLastYear,
      monthlyOtherIncome,
      monthlyLivingExpenses,
      monthlyNonHousingDebt,
      currentAnnualInsurancePremium,
    }));
  }, [
    initialSavingsGoal,
    incomeLastYear,
    monthlyOtherIncome,
    monthlyLivingExpenses,
    monthlyNonHousingDebt,
    currentAnnualInsurancePremium,
    setFormState
  ]);

  return (
    <TooltipProvider>
      <Form {...form}>
        <form className="space-y-6">
          <FormField
            control={form.control}
            name="initialSavingsGoal"
            render={() => (
              <FormItem>
                <div className="flex items-center space-x-2">
                  <FormLabel>Số tiền tích luỹ và được hỗ trợ từ người thân cho việc mua nhà? (triệu VNĐ)</FormLabel>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <InfoIcon className="h-4 w-4 text-slate-500" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">Tổng số tiền bạn đã tiết kiệm và được cho dùng cho việc mua nhà này.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <FormControl>
                  <NumberInput
                    name="initialSavingsGoal"
                    control={form.control}
                    placeholder="0"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="incomeLastYear"
            render={() => (
              <FormItem>
                <div className="flex items-center space-x-2">
                  <FormLabel>Tổng thu nhập năm ngoái của bạn (từ công việc chính) là bao nhiêu? (triệu VNĐ)</FormLabel>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <InfoIcon className="h-4 w-4 text-slate-500" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">Thu nhập từ công việc chính của bạn trong năm vừa qua, bao gồm lương và thưởng.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <FormControl>
                  <NumberInput
                    name="incomeLastYear"
                    control={form.control}
                    placeholder="0"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="monthlyOtherIncome"
            render={() => (
              <FormItem>
                <div className="flex items-center space-x-2">
                  <FormLabel>Thu nhập trung bình hàng tháng từ các nguồn khác? (triệu VNĐ)</FormLabel>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <InfoIcon className="h-4 w-4 text-slate-500" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">Thu nhập từ các nguồn khác như đầu tư, cho thuê, kinh doanh phụ, v.v.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <FormControl>
                  <NumberInput
                    name="monthlyOtherIncome"
                    control={form.control}
                    placeholder="0"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="monthlyLivingExpenses"
            render={() => (
              <FormItem>
                <div className="flex items-center space-x-2">
                  <FormLabel>Chi phí sinh hoạt trung bình hàng tháng của bạn là bao nhiêu? (triệu VNĐ)</FormLabel>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <InfoIcon className="h-4 w-4 text-slate-500" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">Tổng chi phí sinh hoạt hàng tháng bao gồm ăn uống, đi lại, giải trí, v.v.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <FormControl>
                  <NumberInput
                    name="monthlyLivingExpenses"
                    control={form.control}
                    placeholder="0"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="monthlyNonHousingDebt"
            render={() => (
              <FormItem>
                <div className="flex items-center space-x-2">
                  <FormLabel>Bạn trả trung bình hàng tháng bao nhiêu cho các khoản vay khác? (triệu VNĐ)</FormLabel>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <InfoIcon className="h-4 w-4 text-slate-500" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">Các khoản vay khác như vay tiêu dùng, vay mua xe, thẻ tín dụng, v.v.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <FormControl>
                  <NumberInput
                    name="monthlyNonHousingDebt"
                    control={form.control}
                    placeholder="0"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="currentAnnualInsurancePremium"
            render={() => (
              <FormItem>
                <div className="flex items-center space-x-2">
                  <FormLabel>Tổng phí bảo hiểm Nhân thọ & Sức khỏe hàng năm bạn đang đóng là bao nhiêu? (triệu VNĐ)</FormLabel>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <InfoIcon className="h-4 w-4 text-slate-500" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">Tổng phí bảo hiểm nhân thọ và sức khỏe bạn đóng hàng năm.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <FormControl>
                  <NumberInput
                    name="currentAnnualInsurancePremium"
                    control={form.control}
                    placeholder="0"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>
    </TooltipProvider>
  );
}
