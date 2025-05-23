"use client";

import { FormState } from "../plan-form";
import { NumberInput } from "@/components/ui/number-input";
import { FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Form } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect } from "react";

// Define the validation schema for this section
const assumptionsSchema = z.object({
  // Các trường có thể để trống hoặc bằng 0
  pctHouseGrowth: z.coerce.number().min(0).optional(),
  pctSalaryGrowth: z.coerce.number().min(0).optional(),
  pctExpenseGrowth: z.coerce.number().min(0).optional(),
  pctInvestmentReturn: z.coerce.number().min(0).optional(),
  factorMarriage: z.coerce.number().min(0).optional(),
  factorChild: z.coerce.number().min(0).optional(),
  
  // Các trường bắt buộc phải có giá trị > 0
  loanInterestRate: z.coerce.number().min(0.1, "Lãi suất vay mua nhà không được để trống hoặc bằng 0"),
  loanTermMonths: z.coerce.number().int().min(1, "Thời hạn vay không được để trống hoặc bằng 0"),
  
  // Phương pháp trả góp
  paymentMethod: z.enum(["fixed", "decreasing"]).default("fixed"),
});

type AssumptionsSectionProps = {
  formState: FormState;
  setFormState: React.Dispatch<React.SetStateAction<FormState>>;
};

export default function AssumptionsSection({ formState, setFormState }: AssumptionsSectionProps) {
  // Define a typed defaultValues object
  const typedDefaultValues: z.infer<typeof assumptionsSchema> = {
    pctHouseGrowth: formState.pctHouseGrowth,
    pctSalaryGrowth: formState.pctSalaryGrowth,
    pctExpenseGrowth: formState.pctExpenseGrowth,
    pctInvestmentReturn: formState.pctInvestmentReturn,
    factorMarriage: formState.factorMarriage,
    factorChild: formState.factorChild,
    loanInterestRate: formState.loanInterestRate,
    loanTermMonths: formState.loanTermMonths,
    paymentMethod: formState.paymentMethod, // formState.paymentMethod is "fixed" | "decreasing"
  };

  // Initialize the form with react-hook-form
  const form = useForm<z.infer<typeof assumptionsSchema>>({
    resolver: zodResolver(assumptionsSchema),
    defaultValues: typedDefaultValues,
  });

  // Watch specific form values instead of the entire form
  const pctHouseGrowth = form.watch("pctHouseGrowth");
  const pctSalaryGrowth = form.watch("pctSalaryGrowth");
  const pctExpenseGrowth = form.watch("pctExpenseGrowth");
  const pctInvestmentReturn = form.watch("pctInvestmentReturn");
  const factorMarriage = form.watch("factorMarriage");
  const factorChild = form.watch("factorChild");
  const loanInterestRate = form.watch("loanInterestRate");
  const loanTermMonths = form.watch("loanTermMonths");
  const paymentMethod = form.watch("paymentMethod");

  // Update the parent form state when specific form values change
  useEffect(() => {
    setFormState(prev => ({
      ...prev,
      // Các trường có thể để trống - chuyển thành 0 nếu undefined (cho backend)
      pctHouseGrowth: pctHouseGrowth !== undefined ? pctHouseGrowth : 0,
      pctSalaryGrowth: pctSalaryGrowth !== undefined ? pctSalaryGrowth : 0,
      pctExpenseGrowth: pctExpenseGrowth !== undefined ? pctExpenseGrowth : 0,
      pctInvestmentReturn: pctInvestmentReturn !== undefined ? pctInvestmentReturn : 0,
      factorMarriage: factorMarriage !== undefined ? factorMarriage : 0,
      factorChild: factorChild !== undefined ? factorChild : 0,
      
      // Các trường bắt buộc - giữ nguyên giá trị cũ nếu undefined
      loanInterestRate: loanInterestRate !== undefined ? loanInterestRate : prev.loanInterestRate,
      loanTermMonths: loanTermMonths !== undefined ? loanTermMonths : prev.loanTermMonths,
      paymentMethod: paymentMethod || "fixed", // Ensure it's always a valid enum or "fixed"
    }));
  }, [
    pctHouseGrowth, pctSalaryGrowth, pctExpenseGrowth, pctInvestmentReturn,
    factorMarriage, factorChild, loanInterestRate, loanTermMonths, paymentMethod,
    setFormState
  ]);

  return (
    <Form {...form}>
      <form className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Thông tin khoản vay</h3>
          
          <FormField
            control={form.control}
            name="loanInterestRate"
            render={() => (
              <FormItem>
                <FormLabel>Lãi suất vay mua nhà (%)</FormLabel>
                <FormControl>
                  <NumberInput
                    name="loanInterestRate"
                    control={form.control}
                    placeholder="11.0"
                  />
                </FormControl>
                <FormDescription>
                  Lãi suất vay mua nhà dự kiến khi bạn mua nhà (không được để trống hoặc bằng 0)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="loanTermMonths"
            render={() => (
              <FormItem>
                <FormLabel>Thời hạn vay (tháng)</FormLabel>
                <FormControl>
                  <NumberInput
                    name="loanTermMonths"
                    control={form.control}
                    placeholder="300"
                  />
                </FormControl>
                <FormDescription>
                  Thời gian vay dự kiến (300 tháng = 25 năm) (không được để trống hoặc bằng 0)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="paymentMethod"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phương pháp trả góp</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value} // field.value here is "fixed" | "decreasing"
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn phương pháp trả góp" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="fixed">Trả góp cố định (Niên kim)</SelectItem>
                    <SelectItem value="decreasing">Trả góp giảm dần (Dư nợ giảm dần)</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Phương pháp trả góp cố định có khoản thanh toán ban đầu thấp hơn nhưng tổng lãi cao hơn. Phương pháp giảm dần có tổng lãi thấp hơn nhưng khoản thanh toán ban đầu cao hơn.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <h3 className="text-lg font-medium mt-6">Các giả định khác</h3>
          
          <FormField
            control={form.control}
            name="pctHouseGrowth"
            render={() => (
              <FormItem>
                <FormLabel>Tỷ lệ tăng giá nhà hàng năm (%)</FormLabel>
                <FormControl>
                  <NumberInput
                    name="pctHouseGrowth"
                    control={form.control}
                    placeholder="0"
                  />
                </FormControl>
                <FormDescription>
                  Tỷ lệ này là tỷ lệ tăng giá nhà trung bình. Bạn có thể chỉnh sửa dựa trên khu vực của bạn.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="pctSalaryGrowth"
            render={() => (
              <FormItem>
                <FormLabel>Tỷ lệ tăng lương hàng năm (%)</FormLabel>
                <FormControl>
                  <NumberInput
                    name="pctSalaryGrowth"
                    control={form.control}
                    placeholder="0"
                  />
                </FormControl>
                <FormDescription>
                  Tỷ lệ tăng lương trung bình hàng năm của bạn.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="pctExpenseGrowth"
            render={() => (
              <FormItem>
                <FormLabel>Tỷ lệ tăng chi phí hàng năm (%)</FormLabel>
                <FormControl>
                  <NumberInput
                    name="pctExpenseGrowth"
                    control={form.control}
                    placeholder="0"
                  />
                </FormControl>
                <FormDescription>
                  Tỷ lệ tăng chi phí sinh hoạt hàng năm, thường tương đương với lạm phát.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="pctInvestmentReturn"
            render={() => (
              <FormItem>
                <FormLabel>Tỷ suất đầu tư hàng năm (%)</FormLabel>
                <FormControl>
                  <NumberInput
                    name="pctInvestmentReturn"
                    control={form.control}
                    placeholder="0"
                  />
                </FormControl>
                <FormDescription>
                  Tỷ lệ này cần cao hơn tỷ lệ tăng nhà hàng năm. Nếu bạn muốn, Finful sẽ đồng hành với bạn để đạt mục tiêu này.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="factorMarriage"
            render={() => (
              <FormItem>
                <FormLabel>
                  {formState.maritalStatus === "Đã kết hôn/Sống chung" 
                    ? "Chi phí hàng tháng của vợ/chồng so với bạn (%)" 
                    : "Hệ số tăng chi phí khi kết hôn (%)"}
                </FormLabel>
                <FormControl>
                  <NumberInput
                    name="factorMarriage"
                    control={form.control}
                    placeholder="0"
                  />
                </FormControl>
                <FormDescription>
                  {formState.maritalStatus === "Đã kết hôn/Sống chung"
                    ? `Nếu chi phí hàng tháng của bạn là ${formState.monthlyLivingExpenses} triệu, thì chi phí của vợ/chồng bạn sẽ là ${formState.monthlyLivingExpenses * formState.factorMarriage / 100} triệu`
                    : `Khi kết hôn, chi phí sinh hoạt sẽ tăng thêm ${formState.factorMarriage}% so với hiện tại`}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="factorChild"
            render={() => (
              <FormItem>
                <FormLabel>
                  {formState.hasDependents 
                    ? "Chi phí hàng tháng của 1 người con so với bạn (%)" 
                    : "Hệ số tăng chi phí khi có con (%)"}
                </FormLabel>
                <FormControl>
                  <NumberInput
                    name="factorChild"
                    control={form.control}
                    placeholder="0"
                  />
                </FormControl>
                <FormDescription>
                  {formState.hasDependents
                    ? `Nếu chi phí hàng tháng của bạn là ${formState.monthlyLivingExpenses} triệu, thì chi phí của 1 người con sẽ là ${formState.monthlyLivingExpenses * formState.factorChild / 100} triệu`
                    : `Khi có con, chi phí sinh hoạt sẽ tăng thêm ${formState.factorChild}% so với hiện tại cho mỗi người con`}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </form>
    </Form>
  );
}
