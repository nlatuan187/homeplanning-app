/**
 * Step4_Loan.tsx
 *
 * Renders the final step: "Khoản vay mua nhà".
 * Captures loan assumptions and details about any financial support from family.
 * Contains the final submit button for the entire form.
 */
"use client";

import { useFormContext } from 'react-hook-form';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  FamilyGiftTiming,
  FamilyLoanRepaymentType,
  FamilySupportType,
} from '@prisma/client';
import { PlanFormState } from '../types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info } from 'lucide-react';

export const Step4_Loan = () => {
  const form = useFormContext<PlanFormState>();
  const watchHasFamilySupport = form.watch('familySupport.hasFamilySupport');
  const watchFamilySupportType = form.watch(
    'familySupport.familySupportType'
  );
  const watchFamilyLoanRepaymentType = form.watch(
    'familySupport.familyLoanRepaymentType'
  );
  const watchFamilyGiftTiming = form.watch('familySupport.familyGiftTiming');

  return (
    <Card className="bg-slate-900 border-slate-800 rounded-xl">
      <CardHeader>
        <CardTitle>4. Khoản vay & Hỗ trợ</CardTitle>
        <CardDescription>
          Các giả định về khoản vay ngân hàng và các hỗ trợ tài chính bạn có.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Bank Loan Section */}
        <div className="space-y-6 rounded-lg border p-4">
          <h3 className="text-lg font-semibold">Vay ngân hàng</h3>
          <FormField
            control={form.control}
            name="loanInterestRate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Lãi suất vay ngân hàng dự kiến (%/năm)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="8.5"
                    {...field}
                    onChange={(e) =>
                      field.onChange(parseFloat(e.target.value) || 0)
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="loanTermYears"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Thời hạn vay (năm)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="20"
                    {...field}
                    onChange={(e) =>
                      field.onChange(parseInt(e.target.value, 10) || 0)
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="paymentMethod"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel>Phương thức trả nợ</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    value={field.value}
                    defaultValue="fixed"
                    className="flex flex-col space-y-1"
                  >
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="fixed" id="fixed" />
                      </FormControl>
                      <Label htmlFor="fixed" className="font-normal">
                        Dư nợ cố định (Trả góp)
                      </Label>
                    </FormItem>
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="decreasing" id="decreasing" />
                      </FormControl>
                      <Label htmlFor="decreasing" className="font-normal">
                        Dư nợ giảm dần
                      </Label>
                    </FormItem>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Family Support Section */}
        <div className="space-y-4 rounded-lg border p-4">
          <h3 className="text-lg font-semibold">Hỗ trợ từ gia đình</h3>
          <FormField
            control={form.control}
            name="familySupport.hasFamilySupport"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel>
                  Bạn có nhận được sự hỗ trợ tài chính từ gia đình/người thân
                  không?
                </FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={(value) => {
                      const boolValue = value === 'true';
                      field.onChange(boolValue);
                      if (!boolValue) {
                        // Reset all nested familySupport fields when user selects "No"
                        form.setValue('familySupport.familySupportType', null);
                        form.setValue('familySupport.familySupportAmount', 0);
                        form.setValue(
                          'familySupport.familyLoanInterestRate',
                          0
                        );
                        form.setValue(
                          'familySupport.familyLoanRepaymentType',
                          null
                        );
                        form.setValue('familySupport.familyGiftTiming', null);
                        form.setValue('familySupport.familyLoanTermYears', 0);
                      }
                    }}
                    value={field.value?.toString()}
                    className="flex items-center gap-4"
                  >
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="true" id="has-support-yes" />
                      </FormControl>
                      <Label
                        htmlFor="has-support-yes"
                        className="font-normal"
                      >
                        Có
                      </Label>
                    </FormItem>
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="false" id="has-support-no" />
                      </FormControl>
                      <Label
                        htmlFor="has-support-no"
                        className="font-normal"
                      >
                        Không
                      </Label>
                    </FormItem>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {watchHasFamilySupport && (
            <div className="space-y-6 pt-4">
              <FormField
                control={form.control}
                name="familySupport.familySupportType"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel className="font-semibold">
                      Đây là khoản cho TẶNG hay cho VAY?
                    </FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value || ''}
                        className="flex flex-col space-y-1"
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem
                              value={FamilySupportType.GIFT}
                              id="support-type-gift"
                            />
                          </FormControl>
                          <Label
                            htmlFor="support-type-gift"
                            className="font-normal"
                          >
                            Cho tặng (không cần hoàn lại)
                          </Label>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem
                              value={FamilySupportType.LOAN}
                              id="support-type-loan"
                            />
                          </FormControl>
                          <Label
                            htmlFor="support-type-loan"
                            className="font-normal"
                          >
                            Cho vay (cần hoàn lại)
                          </Label>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Unified amount input field */}
              {watchFamilySupportType && (
                <FormField
                  control={form.control}
                  name="familySupport.familySupportAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Số tiền{' '}
                        {watchFamilySupportType === FamilySupportType.GIFT ? 'tặng' : 'vay'}{' '}
                        (triệu VNĐ)
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder={
                            watchFamilySupportType === FamilySupportType.GIFT
                              ? '400'
                              : 'Nhập số tiền vay'
                          }
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseFloat(e.target.value) || 0)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Fields specific to GIFT */}
              {watchFamilySupportType === FamilySupportType.GIFT && (
                <FormField
                  control={form.control}
                  name="familySupport.familyGiftTiming"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>
                        Khi nào bạn sẽ nhận được khoản này?
                      </FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={(value) =>
                            field.onChange(value as FamilyGiftTiming)
                          }
                          value={field.value || ''}
                          className="flex flex-col space-y-1"
                        >
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem
                                value={FamilyGiftTiming.NOW}
                                id="gift-timing-now"
                              />
                            </FormControl>
                            <Label
                              htmlFor="gift-timing-now"
                              className="font-normal"
                            >
                              Ngay bây giờ (để mang đi đầu tư)
                            </Label>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem
                                value={FamilyGiftTiming.AT_PURCHASE}
                                id="gift-timing-purchase"
                              />
                            </FormControl>
                            <Label
                              htmlFor="gift-timing-purchase"
                              className="font-normal"
                            >
                              Khi thanh toán mua nhà
                            </Label>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      {watchFamilyGiftTiming === FamilyGiftTiming.NOW && (
                        <FormDescription className="text-sky-400">
                          Khoản hỗ trợ này sẽ được gộp vào vốn tự có ban đầu của bạn để đầu tư.
                        </FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Fields specific to LOAN */}
              {watchFamilySupportType === FamilySupportType.LOAN && (
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="familySupport.familyLoanInterestRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lãi suất vay (%/năm)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Nhập lãi suất (nếu không có, nhập 0)"
                            {...field}
                            onChange={(e) =>
                              field.onChange(parseFloat(e.target.value) || 0)
                            }
                          />
                        </FormControl>
                        <FormDescription>
                          Nếu không có lãi suất, vui lòng nhập 0.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="familySupport.familyLoanRepaymentType"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>
                          Bạn sẽ trả nợ theo hình thức nào?
                        </FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value || ''}
                            className="flex flex-col space-y-1"
                          >
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem
                                  value={FamilyLoanRepaymentType.MONTHLY}
                                  id="repayment-monthly"
                                />
                              </FormControl>
                              <Label
                                htmlFor="repayment-monthly"
                                className="font-normal"
                              >
                                Trả góp đều hàng tháng
                              </Label>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem
                                  value={FamilyLoanRepaymentType.LUMP_SUM}
                                  id="repayment-lump-sum"
                                />
                              </FormControl>
                              <Label
                                htmlFor="repayment-lump-sum"
                                className="font-normal"
                              >
                                Trả một lần vào cuối kỳ
                              </Label>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {watchFamilyLoanRepaymentType ===
                    FamilyLoanRepaymentType.MONTHLY && (
                    <FormField
                      control={form.control}
                      name="familySupport.familyLoanTermYears"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Thời hạn vay gia đình (năm)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="5"
                              {...field}
                              onChange={(e) =>
                                field.onChange(
                                  parseInt(e.target.value, 10) || 0
                                )
                              }
                            />
                          </FormControl>
                          <FormDescription>
                            Thời gian bạn dự định sẽ hoàn trả khoản vay cho
                            gia đình.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}; 