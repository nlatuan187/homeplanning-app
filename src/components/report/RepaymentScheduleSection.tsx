import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/actions/utils/formatters";

interface RepaymentScheduleProps {
  amortizationSchedule: {
    monthlySchedule: Array<{
      month: number;
      payment: number;
      principal: number;
      interest: number;
      remainingBalance: number;
    }>;
    yearlySchedule: Array<{
      year: number;
      totalPayment: number;
      totalPrincipal: number;
      totalInterest: number;
      remainingBalance: number;
    }>;
    summary: {
      totalPayment: number;
      totalInterest: number;
      monthlyPayment: number;
      lastMonthPayment?: number;
    };
  };
  paymentMethod: "fixed" | "decreasing";
  loanAmount: number;
  loanTermMonths: number;
  interestRate: number;
}

export function RepaymentScheduleSection({
  amortizationSchedule,
  paymentMethod,
  loanAmount,
  loanTermMonths,
  interestRate
}: RepaymentScheduleProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Get the first 24 months and last 12 months of the schedule for display
  const firstTwoYearsSchedule = amortizationSchedule.monthlySchedule.slice(0, 24);
  const lastYearSchedule = amortizationSchedule.monthlySchedule.slice(-12);
  
  // Only show the last year if it's different from the first two years
  const showLastYear = loanTermMonths > 24;
  
  // Format the payment method for display
  const paymentMethodDisplay = paymentMethod === "fixed" 
    ? "cố định (niên kim)" 
    : "giảm dần (dư nợ giảm dần)";
  
  // Format the loan term for display
  const loanTermYears = Math.floor(loanTermMonths / 12);
  const remainingMonths = loanTermMonths % 12;
  const loanTermDisplay = remainingMonths > 0
    ? `${loanTermYears} năm ${remainingMonths} tháng`
    : `${loanTermYears} năm`;
  
  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h3 className="text-xl font-semibold">Lịch trả nợ chi tiết</h3>
          <p className="text-slate-500">
            Phương pháp trả góp: <span className="font-medium">{paymentMethodDisplay}</span>
          </p>
        </div>
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button>Xem lịch trả nợ chi tiết</Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[80vh] max-w-full sm:max-w-full">
            <SheetHeader className="mb-4">
              <SheetTitle>Lịch trả nợ chi tiết</SheetTitle>
              <SheetDescription>
                Khoản vay: {formatNumber(loanAmount)} tỷ VND • Lãi suất: {interestRate}% • Thời hạn: {loanTermDisplay} • Phương pháp: {paymentMethodDisplay}
              </SheetDescription>
            </SheetHeader>
            
            <Tabs defaultValue="monthly" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="monthly">Theo tháng</TabsTrigger>
                <TabsTrigger value="yearly">Theo năm</TabsTrigger>
                <TabsTrigger value="summary">Tổng quan</TabsTrigger>
              </TabsList>
              
              <TabsContent value="monthly" className="max-h-[60vh] overflow-auto">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-lg font-medium mb-2">24 tháng đầu tiên</h4>
                    <div className="overflow-x-auto -mx-4 sm:mx-0">
                      <div className="inline-block min-w-full align-middle">
                        <table className="min-w-full divide-y divide-slate-700">
                          <thead>
                            <tr className="bg-slate-800">
                              <th className="py-2 px-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Tháng</th>
                              <th className="py-2 px-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">Trả góp</th>
                              <th className="py-2 px-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">Gốc</th>
                              <th className="py-2 px-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">Lãi</th>
                              <th className="py-2 px-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">Dư nợ</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-700">
                            {firstTwoYearsSchedule.map((row) => (
                              <tr key={row.month} className="hover:bg-slate-800/50">
                                <td className="py-2 px-3 text-left whitespace-nowrap">{row.month}</td>
                                <td className="py-2 px-3 text-right">{formatNumber(row.payment)}</td>
                                <td className="py-2 px-3 text-right">{formatNumber(row.principal)}</td>
                                <td className="py-2 px-3 text-right">{formatNumber(row.interest)}</td>
                                <td className="py-2 px-3 text-right">{formatNumber(row.remainingBalance)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                  
                  {showLastYear && (
                    <div>
                      <h4 className="text-lg font-medium mb-2">12 tháng cuối cùng</h4>
                      <div className="overflow-x-auto -mx-4 sm:mx-0">
                        <div className="inline-block min-w-full align-middle">
                          <table className="min-w-full divide-y divide-slate-700">
                            <thead>
                              <tr className="bg-slate-800">
                                <th className="py-2 px-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Tháng</th>
                                <th className="py-2 px-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">Trả góp</th>
                                <th className="py-2 px-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">Gốc</th>
                                <th className="py-2 px-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">Lãi</th>
                                <th className="py-2 px-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">Dư nợ</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700">
                              {lastYearSchedule.map((row) => (
                                <tr key={row.month} className="hover:bg-slate-800/50">
                                  <td className="py-2 px-3 text-left whitespace-nowrap">{row.month}</td>
                                  <td className="py-2 px-3 text-right">{formatNumber(row.payment)}</td>
                                  <td className="py-2 px-3 text-right">{formatNumber(row.principal)}</td>
                                  <td className="py-2 px-3 text-right">{formatNumber(row.interest)}</td>
                                  <td className="py-2 px-3 text-right">{formatNumber(row.remainingBalance)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="yearly" className="max-h-[60vh] overflow-auto">
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <div className="inline-block min-w-full align-middle">
                    <table className="min-w-full divide-y divide-slate-700">
                      <thead>
                        <tr className="bg-slate-800">
                          <th className="py-2 px-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Năm</th>
                          <th className="py-2 px-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">Tổng trả góp</th>
                          <th className="py-2 px-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">Tổng gốc</th>
                          <th className="py-2 px-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">Tổng lãi</th>
                          <th className="py-2 px-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">Dư nợ cuối năm</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700">
                        {amortizationSchedule.yearlySchedule.map((row) => (
                          <tr key={row.year} className="hover:bg-slate-800/50">
                            <td className="py-2 px-3 text-left whitespace-nowrap">{row.year}</td>
                            <td className="py-2 px-3 text-right">{formatNumber(row.totalPayment)}</td>
                            <td className="py-2 px-3 text-right">{formatNumber(row.totalPrincipal)}</td>
                            <td className="py-2 px-3 text-right">{formatNumber(row.totalInterest)}</td>
                            <td className="py-2 px-3 text-right">{formatNumber(row.remainingBalance)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="summary">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h4 className="text-lg font-medium">Tổng quan khoản vay</h4>
                    <ul className="space-y-2">
                      <li className="flex justify-between">
                        <span className="text-slate-400">Số tiền vay:</span>
                        <span className="font-medium">{formatNumber(loanAmount)} tỷ VND</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-slate-400">Lãi suất:</span>
                        <span className="font-medium">{interestRate}%</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-slate-400">Thời hạn vay:</span>
                        <span className="font-medium">{loanTermDisplay}</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-slate-400">Phương pháp trả góp:</span>
                        <span className="font-medium">{paymentMethodDisplay}</span>
                      </li>
                    </ul>
                  </div>
                  
                  <div className="space-y-4">
                    <h4 className="text-lg font-medium">Tổng kết chi phí</h4>
                    <ul className="space-y-2">
                      <li className="flex justify-between">
                        <span className="text-slate-400">Khoản trả góp {paymentMethod === "fixed" ? "hàng tháng" : "tháng đầu"}:</span>
                        <span className="font-medium">{formatNumber(amortizationSchedule.summary.monthlyPayment)} tỷ VND</span>
                      </li>
                      {paymentMethod === "decreasing" && amortizationSchedule.summary.lastMonthPayment && (
                        <li className="flex justify-between">
                          <span className="text-slate-400">Khoản trả góp tháng cuối:</span>
                          <span className="font-medium">{formatNumber(amortizationSchedule.summary.lastMonthPayment)} tỷ VND</span>
                        </li>
                      )}
                      <li className="flex justify-between">
                        <span className="text-slate-400">Tổng tiền gốc:</span>
                        <span className="font-medium">{formatNumber(loanAmount)} tỷ VND</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-slate-400">Tổng tiền lãi:</span>
                        <span className="font-medium">{formatNumber(amortizationSchedule.summary.totalInterest)} tỷ VND</span>
                      </li>
                      <li className="flex justify-between border-t border-slate-700 pt-2 mt-2">
                        <span className="text-slate-400">Tổng chi phí:</span>
                        <span className="font-medium">{formatNumber(amortizationSchedule.summary.totalPayment)} tỷ VND</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </SheetContent>
        </Sheet>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-800/50 p-4 rounded-lg">
          <h4 className="font-medium mb-2">Tổng quan khoản vay</h4>
          <ul className="space-y-1 text-sm">
            <li className="flex justify-between">
              <span className="text-slate-400">Số tiền vay:</span>
              <span>{formatNumber(loanAmount)} tỷ VND</span>
            </li>
            <li className="flex justify-between">
              <span className="text-slate-400">Lãi suất:</span>
              <span>{interestRate}%</span>
            </li>
            <li className="flex justify-between">
              <span className="text-slate-400">Thời hạn vay:</span>
              <span>{loanTermDisplay}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-slate-400">Phương pháp trả góp:</span>
              <span>{paymentMethodDisplay}</span>
            </li>
          </ul>
        </div>
        
        <div className="bg-slate-800/50 p-4 rounded-lg">
          <h4 className="font-medium mb-2">Chi phí khoản vay</h4>
          <ul className="space-y-1 text-sm">
            <li className="flex justify-between">
              <span className="text-slate-400">Khoản trả góp {paymentMethod === "fixed" ? "hàng tháng" : "tháng đầu"}:</span>
              <span>{formatNumber(amortizationSchedule.summary.monthlyPayment)} tỷ VND</span>
            </li>
            {paymentMethod === "decreasing" && amortizationSchedule.summary.lastMonthPayment && (
              <li className="flex justify-between">
                <span className="text-slate-400">Khoản trả góp tháng cuối:</span>
                <span>{formatNumber(amortizationSchedule.summary.lastMonthPayment)} tỷ VND</span>
              </li>
            )}
            <li className="flex justify-between">
              <span className="text-slate-400">Tổng tiền lãi:</span>
              <span>{formatNumber(amortizationSchedule.summary.totalInterest)} tỷ VND</span>
            </li>
            <li className="flex justify-between">
              <span className="text-slate-400">Tổng chi phí:</span>
              <span>{formatNumber(amortizationSchedule.summary.totalPayment)} tỷ VND</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
