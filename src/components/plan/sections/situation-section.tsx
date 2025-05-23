"use client";

import { FormState } from "../plan-form";
import { Input } from "@/components/ui/input";
import { CustomRadioGroup, CustomRadioGroupItem } from "@/components/ui/custom-radio-group";
import { Switch } from "@/components/ui/switch";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Form } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect } from "react";

// Define the validation schema for this section
const situationSchema = z.object({
  maritalStatus: z.enum(["Độc thân", "Đã kết hôn/Sống chung"], {
    message: "Vui lòng chọn tình trạng hôn nhân",
  }),
  buyTogetherFlag: z.boolean().optional(),
  spouseMonthlyIncome: z.coerce.number().nonnegative().optional(),
  hasDependents: z.boolean(),
  numberOfDependents: z.coerce.number().int().nonnegative().optional(),
});

type SituationSectionProps = {
  formState: FormState;
  setFormState: React.Dispatch<React.SetStateAction<FormState>>;
};

export default function SituationSection({ formState, setFormState }: SituationSectionProps) {
  // Initialize the form with react-hook-form
  const form = useForm<z.infer<typeof situationSchema>>({
    resolver: zodResolver(situationSchema),
    defaultValues: {
      maritalStatus: formState.maritalStatus as "Độc thân" | "Đã kết hôn/Sống chung",
      buyTogetherFlag: formState.buyTogetherFlag,
      spouseMonthlyIncome: formState.spouseMonthlyIncome,
      hasDependents: formState.hasDependents,
      numberOfDependents: formState.numberOfDependents,
    },
  });

  // Watch specific form values instead of the entire form
  const maritalStatus = form.watch("maritalStatus");
  const buyTogetherFlag = form.watch("buyTogetherFlag");
  const spouseMonthlyIncome = form.watch("spouseMonthlyIncome");
  const hasDependents = form.watch("hasDependents");
  const numberOfDependents = form.watch("numberOfDependents");

  // Update the parent form state when specific form values change
  useEffect(() => {
    setFormState((prev) => ({
      ...prev,
      maritalStatus,
      buyTogetherFlag: buyTogetherFlag || false,
      spouseMonthlyIncome: spouseMonthlyIncome || 0,
      hasDependents,
      numberOfDependents: numberOfDependents || 0,
    }));
  }, [maritalStatus, buyTogetherFlag, spouseMonthlyIncome, hasDependents, numberOfDependents, setFormState]);

  return (
    <Form {...form}>
      <form className="space-y-6">
        <FormField
          control={form.control}
          name="maritalStatus"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Tình trạng hôn nhân?</FormLabel>
              <FormControl>
                <CustomRadioGroup
                  value={field.value}
                  onValueChange={field.onChange}
                  className="flex flex-col space-y-1"
                >
                  <CustomRadioGroupItem value="Độc thân">
                    <FormLabel className="font-normal">Độc thân</FormLabel>
                  </CustomRadioGroupItem>
                  <CustomRadioGroupItem value="Đã kết hôn/Sống chung">
                    <FormLabel className="font-normal">Đã kết hôn/Sống chung</FormLabel>
                  </CustomRadioGroupItem>
                </CustomRadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {maritalStatus === "Đã kết hôn/Sống chung" && (
          <>
            <FormField
              control={form.control}
              name="buyTogetherFlag"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Bạn có mua nhà cùng vợ/chồng/bạn đời không?</FormLabel>
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

            {buyTogetherFlag && (
              <FormField
                control={form.control}
                name="spouseMonthlyIncome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Thu nhập trung bình hàng tháng của vợ/chồng/bạn đời bạn là bao nhiêu? (triệu VNĐ)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </>
        )}

        <FormField
          control={form.control}
          name="hasDependents"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Bạn có người phụ thuộc tài chính không?</FormLabel>
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

        {hasDependents && (
          <FormField
            control={form.control}
            name="numberOfDependents"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Số lượng người phụ thuộc?</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </form>
    </Form>
  );
}
