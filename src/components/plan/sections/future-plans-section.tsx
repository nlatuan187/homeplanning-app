"use client";

import { FormState } from "../plan-form";
import { Input } from "@/components/ui/input";
import { CustomRadioGroup, CustomRadioGroupItem } from "@/components/ui/custom-radio-group";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Form } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect } from "react";

// Get current year
const currentYear = new Date().getFullYear();

// Define the validation schema for this section
const futurePlansSchema = z.object({
  plansMarriageBeforeTarget: z.enum(["Có", "Không", "Chưa chắc"], {
    message: "Vui lòng chọn một lựa chọn",
  }).optional(),
  targetMarriageYear: z.coerce.number().int().min(currentYear).optional(),
  plansChildBeforeTarget: z.enum(["Có", "Không", "Chưa chắc"], {
    message: "Vui lòng chọn một lựa chọn",
  }).optional(),
  targetChildYear: z.coerce.number().int().min(currentYear).optional(),
});

type FuturePlansSectionProps = {
  formState: FormState;
  setFormState: React.Dispatch<React.SetStateAction<FormState>>;
};

export default function FuturePlansSection({ formState, setFormState }: FuturePlansSectionProps) {
  // Calculate target year
  const targetYear = currentYear + formState.yearsToPurchase;

  // Initialize the form with react-hook-form
  const form = useForm<z.infer<typeof futurePlansSchema>>({
    resolver: zodResolver(futurePlansSchema),
    defaultValues: {
      plansMarriageBeforeTarget: formState.plansMarriageBeforeTarget ? "Có" : "Không",
      targetMarriageYear: formState.targetMarriageYear || undefined,
      plansChildBeforeTarget: formState.plansChildBeforeTarget ? "Có" : "Không",
      targetChildYear: formState.targetChildYear || undefined,
    },
  });

  // Watch specific form values instead of the entire form
  const plansMarriageBeforeTarget = form.watch("plansMarriageBeforeTarget");
  const targetMarriageYear = form.watch("targetMarriageYear");
  const plansChildBeforeTarget = form.watch("plansChildBeforeTarget");
  const targetChildYear = form.watch("targetChildYear");

  // Update the parent form state when specific form values change
  useEffect(() => {
    setFormState(prev => ({
      ...prev,
      plansMarriageBeforeTarget: plansMarriageBeforeTarget === "Có",
      targetMarriageYear: targetMarriageYear ? targetMarriageYear : null,
      plansChildBeforeTarget: plansChildBeforeTarget === "Có",
      targetChildYear: targetChildYear ? targetChildYear : null,
    }));
  }, [
    plansMarriageBeforeTarget, targetMarriageYear, 
    plansChildBeforeTarget, targetChildYear,
    setFormState
  ]);

  return (
    <Form {...form}>
      <form className="space-y-6">
        {formState.maritalStatus === "Độc thân" && (
          <>
            <FormField
              control={form.control}
              name="plansMarriageBeforeTarget"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Bạn có dự định kết hôn trước năm {targetYear} không?</FormLabel>
                  <FormControl>
                    <CustomRadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      className="flex flex-col space-y-1"
                    >
                      <CustomRadioGroupItem value="Có">
                        <FormLabel className="font-normal">Có</FormLabel>
                      </CustomRadioGroupItem>
                      <CustomRadioGroupItem value="Không">
                        <FormLabel className="font-normal">Không</FormLabel>
                      </CustomRadioGroupItem>
                      <CustomRadioGroupItem value="Chưa chắc">
                        <FormLabel className="font-normal">Chưa chắc</FormLabel>
                      </CustomRadioGroupItem>
                    </CustomRadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {plansMarriageBeforeTarget === "Có" && (
              <FormField
                control={form.control}
                name="targetMarriageYear"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Khoảng năm nào?</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min={currentYear} 
                        max={targetYear} 
                        value={field.value || ''} 
                        onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </>
        )}

        {!formState.hasDependents && (
          <>
            <FormField
              control={form.control}
              name="plansChildBeforeTarget"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Bạn có dự định sinh con trước năm {targetYear} không?</FormLabel>
                  <FormControl>
                    <CustomRadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      className="flex flex-col space-y-1"
                    >
                      <CustomRadioGroupItem value="Có">
                        <FormLabel className="font-normal">Có</FormLabel>
                      </CustomRadioGroupItem>
                      <CustomRadioGroupItem value="Không">
                        <FormLabel className="font-normal">Không</FormLabel>
                      </CustomRadioGroupItem>
                      <CustomRadioGroupItem value="Chưa chắc">
                        <FormLabel className="font-normal">Chưa chắc</FormLabel>
                      </CustomRadioGroupItem>
                    </CustomRadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {plansChildBeforeTarget === "Có" && (
              <FormField
                control={form.control}
                name="targetChildYear"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Khoảng năm nào?</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min={currentYear} 
                        max={targetYear} 
                        value={field.value || ''} 
                        onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </>
        )}

        {/* Assumptions section has been moved to its own component */}
      </form>
    </Form>
  );
}
