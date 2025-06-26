/**
 * Step1_Goal.tsx
 * 
 * This component renders the first step of the multi-step form: "Mục tiêu mua nhà".
 * It captures the user's goal, including the timeline, desired house price, and assumptions about appreciation.
 * It features dynamic helper text and an explanation sheet for key assumptions.
 */
"use client";

import { useState, useMemo } from "react";
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
  CustomRadioGroup,
  CustomRadioGroupItem,
} from "@/components/ui/custom-radio-group";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
// NOTE: AssumptionSheet/Modal logic will be handled in a separate step as requested by user.

export const Step1_Goal = () => {
  const { control, watch } = useFormContext<PlanFormState>();
  const [openModal, setOpenModal] = useState<string | null>(null);

  const yearsToPurchase = watch("yearsToPurchase");
  const targetHousePriceN0 = watch("targetHousePriceN0");
  const pctHouseGrowth = watch("pctHouseGrowth");

  const targetPurchaseDate = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const targetYear = currentYear + (yearsToPurchase || 0);
    return `tháng ${currentMonth}/${targetYear}`;
  }, [yearsToPurchase]);

  const futureHousePriceInBillions = useMemo(() => {
    const price =
      (targetHousePriceN0 || 0) *
      Math.pow(1 + (pctHouseGrowth || 0) / 100, yearsToPurchase || 0);
    return price / 1000;
  }, [targetHousePriceN0, pctHouseGrowth, yearsToPurchase]);

  return (
    <>
      <Card className="bg-slate-900 border-slate-800 rounded-xl">
        <CardHeader>
          <CardTitle>1. Mục tiêu của bạn</CardTitle>
          <CardDescription>
            Hãy bắt đầu với mục tiêu mua nhà của bạn.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <FormField
            control={control}
            name="yearsToPurchase"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Bạn muốn mua nhà sau bao nhiêu năm nữa?
                </FormLabel>
                <FormControl>
                  <NumberInput name={field.name} control={control} />
                </FormControl>
                 <p className="text-cyan-400 text-sm mt-1">Dự kiến mua nhà vào {targetPurchaseDate}.</p>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="targetHousePriceN0"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Giá trị HIỆN TẠI của căn nhà (triệu VNĐ)</FormLabel>
                <FormControl>
                  <NumberInput name={field.name} control={control} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="pctHouseGrowth"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center">
                  Tốc độ tăng giá nhà mỗi năm (%)
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-2 h-5 w-5"
                    onClick={() => setOpenModal("houseGrowth")}
                  >
                    <Info className="h-4 w-4 text-cyan-400" />
                  </Button>
                </FormLabel>
                <FormControl>
                  <NumberInput
                    name={field.name}
                    control={control}
                  />
                </FormControl>
                <p className="text-cyan-400 text-sm mt-1">
                  Giá nhà ước tính tại thời điểm mua:{" "}
                  {futureHousePriceInBillions.toFixed(2)} tỷ VNĐ.
                </p>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="targetHouseType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Loại nhà bạn muốn mua</FormLabel>
                <FormControl>
                  <CustomRadioGroup
                    onValueChange={field.onChange}
                    value={field.value}
                    className="flex space-x-4"
                  >
                    <CustomRadioGroupItem value="Chung cư">
                      <Label className="cursor-pointer">Chung cư</Label>
                    </CustomRadioGroupItem>
                    <CustomRadioGroupItem value="Nhà đất">
                      <Label className="cursor-pointer">Nhà đất</Label>
                    </CustomRadioGroupItem>
                    <CustomRadioGroupItem value="Khác">
                      <Label className="cursor-pointer">Khác</Label>
                    </CustomRadioGroupItem>
                  </CustomRadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="targetLocation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tỉnh/thành phố bạn muốn mua nhà</FormLabel>
                <FormControl>
                  <Input {...field} className="bg-slate-800" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      <AssumptionModal
        isOpen={openModal === "houseGrowth"}
        onClose={() => setOpenModal(null)}
        title="Tốc độ tăng giá nhà mỗi năm"
        currentValue={`${pctHouseGrowth}%`}
        explanation="Giá nhà sẽ tăng liên tục theo thời gian vì nhu cầu cao, đô thị hóa nhanh, chi phí xây dựng và đầu tư tăng. 10% cũng là mức tăng giá trung bình, nhất là tại TP.HCM và Hà Nội – nơi quỹ đất khan hiếm và hạ tầng liên tục mở rộng."
        onConfirm={() => {
          /* a no-op since ref is removed */
        }}
      />
    </>
  );
};