"use client";

import { FormState } from "../plan-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ReviewSectionProps = {
  formState: FormState;
};

export default function ReviewSection({ formState }: ReviewSectionProps) {
  // Get current year
  const currentYear = new Date().getFullYear();
  
  // Calculate target year
  const targetYear = currentYear + formState.yearsToPurchase;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Mục tiêu của bạn</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-2">
            <div className="flex justify-between">
              <dt className="font-medium text-slate-500">Dự định mua nhà trong:</dt>
              <dd>{formState.yearsToPurchase} năm nữa (năm {targetYear})</dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-medium text-slate-500">Giá trị căn nhà dự kiến:</dt>
              <dd>{formState.targetHousePriceN0.toLocaleString()} triệu VNĐ</dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-medium text-slate-500">Loại nhà:</dt>
              <dd>{formState.targetHouseType}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-medium text-slate-500">Khu vực:</dt>
              <dd>{formState.targetLocation}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tình trạng hiện tại</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-2">
            <div className="flex justify-between">
              <dt className="font-medium text-slate-500">Tình trạng hôn nhân:</dt>
              <dd>{formState.maritalStatus}</dd>
            </div>
            {formState.maritalStatus === "Đã kết hôn/Sống chung" && (
              <>
                <div className="flex justify-between">
                  <dt className="font-medium text-slate-500">Mua nhà cùng vợ/chồng/bạn đời:</dt>
                  <dd>{formState.buyTogetherFlag ? "Có" : "Không"}</dd>
                </div>
                {formState.buyTogetherFlag && (
                  <div className="flex justify-between">
                    <dt className="font-medium text-slate-500">Thu nhập hàng tháng của vợ/chồng/bạn đời:</dt>
                    <dd>{formState.spouseMonthlyIncome.toLocaleString()} triệu VNĐ</dd>
                  </div>
                )}
              </>
            )}
            <div className="flex justify-between">
              <dt className="font-medium text-slate-500">Có người phụ thuộc tài chính:</dt>
              <dd>{formState.hasDependents ? "Có" : "Không"}</dd>
            </div>
            {formState.hasDependents && (
              <div className="flex justify-between">
                <dt className="font-medium text-slate-500">Số lượng người phụ thuộc:</dt>
                <dd>{formState.numberOfDependents}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tài chính của bạn</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-2">
            <div className="flex justify-between">
              <dt className="font-medium text-slate-500">Tiết kiệm hiện tại cho việc mua nhà:</dt>
              <dd>{formState.initialSavingsGoal.toLocaleString()} triệu VNĐ</dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-medium text-slate-500">Thu nhập năm ngoái:</dt>
              <dd>{formState.incomeLastYear.toLocaleString()} triệu VNĐ</dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-medium text-slate-500">Thu nhập hàng tháng từ các nguồn khác:</dt>
              <dd>{formState.monthlyOtherIncome.toLocaleString()} triệu VNĐ</dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-medium text-slate-500">Chi phí sinh hoạt hàng tháng:</dt>
              <dd>{formState.monthlyLivingExpenses.toLocaleString()} triệu VNĐ</dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-medium text-slate-500">Khoản vay khác hàng tháng:</dt>
              <dd>{formState.monthlyNonHousingDebt.toLocaleString()} triệu VNĐ</dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-medium text-slate-500">Phí bảo hiểm hàng năm:</dt>
              <dd>{formState.currentAnnualInsurancePremium.toLocaleString()} triệu VNĐ</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Kế hoạch tương lai</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-2">
            {formState.maritalStatus === "Độc thân" && (
              <>
                <div className="flex justify-between">
                  <dt className="font-medium text-slate-500">Dự định kết hôn trước năm {targetYear}:</dt>
                  <dd>{formState.plansMarriageBeforeTarget ? "Có" : "Không"}</dd>
                </div>
                {formState.plansMarriageBeforeTarget && formState.targetMarriageYear && (
                  <div className="flex justify-between">
                    <dt className="font-medium text-slate-500">Năm dự định kết hôn:</dt>
                    <dd>{formState.targetMarriageYear}</dd>
                  </div>
                )}
              </>
            )}
            {!formState.hasDependents && (
              <>
                <div className="flex justify-between">
                  <dt className="font-medium text-slate-500">Dự định sinh con trước năm {targetYear}:</dt>
                  <dd>{formState.plansChildBeforeTarget ? "Có" : "Không"}</dd>
                </div>
                {formState.plansChildBeforeTarget && formState.targetChildYear && (
                  <div className="flex justify-between">
                    <dt className="font-medium text-slate-500">Năm dự định sinh con:</dt>
                    <dd>{formState.targetChildYear}</dd>
                  </div>
                )}
              </>
            )}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Các giả định</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-2">
            <div className="flex justify-between">
              <dt className="font-medium text-slate-500">Tỷ lệ tăng giá nhà hàng năm:</dt>
              <dd>{formState.pctHouseGrowth}%</dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-medium text-slate-500">Tỷ lệ tăng lương hàng năm:</dt>
              <dd>{formState.pctSalaryGrowth}%</dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-medium text-slate-500">Tỷ lệ tăng chi phí hàng năm:</dt>
              <dd>{formState.pctExpenseGrowth}%</dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-medium text-slate-500">Tỷ suất đầu tư hàng năm:</dt>
              <dd>{formState.pctInvestmentReturn}%</dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-medium text-slate-500">Hệ số tăng chi phí khi kết hôn:</dt>
              <dd>{formState.factorMarriage}%</dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-medium text-slate-500">Hệ số tăng chi phí khi có con:</dt>
              <dd>{formState.factorChild}%</dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-medium text-slate-500">Lãi suất vay mua nhà:</dt>
              <dd>{formState.loanInterestRate}%</dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-medium text-slate-500">Thời hạn vay:</dt>
              <dd>{formState.loanTermMonths} tháng</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
