"use client";

import { FormState } from "../plan-form";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { CustomRadioGroup, CustomRadioGroupItem } from "@/components/ui/custom-radio-group";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Form } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect } from "react";

// Define the validation schema for this section
const goalSchema = z.object({
  yearsToPurchase: z.coerce.number().int().min(1, {
    message: "Số năm phải là số nguyên lớn hơn hoặc bằng 1",
  }),
  targetHousePriceN0: z.coerce.number().positive({
    message: "Giá nhà phải là số dương",
  }),
  targetHouseType: z.enum(["Chung cư", "Nhà đất", "Khác"], {
    message: "Vui lòng chọn loại nhà",
  }),
  targetLocation: z.string().min(1, {
    message: "Vui lòng nhập khu vực",
  }),
});

type GoalSectionProps = {
  formState: FormState;
  setFormState: React.Dispatch<React.SetStateAction<FormState>>;
};

export default function GoalSection({ formState, setFormState }: GoalSectionProps) {
  // Initialize the form with react-hook-form
  const form = useForm<z.infer<typeof goalSchema>>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      yearsToPurchase: formState.yearsToPurchase,
      targetHousePriceN0: formState.targetHousePriceN0,
      targetHouseType: formState.targetHouseType as "Chung cư" | "Nhà đất" | "Khác",
      targetLocation: formState.targetLocation,
    },
  });

  // Watch specific form values instead of the entire form
  const yearsToPurchase = form.watch("yearsToPurchase");
  const targetHousePriceN0 = form.watch("targetHousePriceN0");
  const targetHouseType = form.watch("targetHouseType");
  const targetLocation = form.watch("targetLocation");

  // Update the parent form state when specific form values change
  useEffect(() => {
    setFormState((prev) => ({
      ...prev,
      yearsToPurchase,
      targetHousePriceN0,
      targetHouseType,
      targetLocation,
    }));
  }, [yearsToPurchase, targetHousePriceN0, targetHouseType, targetLocation, setFormState]);

  return (
    <Form {...form}>
      <form className="space-y-6">
        <FormField
          control={form.control}
          name="yearsToPurchase"
          render={() => (
            <FormItem>
              <FormLabel>Bạn dự định mua nhà trong bao nhiêu năm nữa?</FormLabel>
              <FormControl>
                <NumberInput
                  name="yearsToPurchase"
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
          name="targetHousePriceN0"
          render={() => (
            <FormItem>
              <FormLabel>Giá trị căn nhà bạn muốn mua dự kiến là bao nhiêu? (triệu VNĐ)</FormLabel>
              <FormControl>
                <NumberInput
                  name="targetHousePriceN0"
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
          name="targetHouseType"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Loại nhà bạn muốn mua?</FormLabel>
              <FormControl>
                <CustomRadioGroup
                  value={field.value}
                  onValueChange={field.onChange}
                  className="flex flex-col space-y-1"
                >
                  <CustomRadioGroupItem value="Chung cư">
                    <FormLabel className="font-normal">Chung cư</FormLabel>
                  </CustomRadioGroupItem>
                  <CustomRadioGroupItem value="Nhà đất">
                    <FormLabel className="font-normal">Nhà đất</FormLabel>
                  </CustomRadioGroupItem>
                  <CustomRadioGroupItem value="Khác">
                    <FormLabel className="font-normal">Khác</FormLabel>
                  </CustomRadioGroupItem>
                </CustomRadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="targetLocation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Khu vực mong muốn?</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}
