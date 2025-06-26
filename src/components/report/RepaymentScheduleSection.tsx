import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/actions/utils/formatters";
import { 
  AmortizationScheduleData, 
  FamilyLoanDetails
} from "@/actions/reportSections/capitalStructure";

interface RepaymentScheduleProps {
  amortizationSchedule: AmortizationScheduleData;
  familyLoanDetails?: FamilyLoanDetails;
  loanTermYears: number;
  paymentMethod: "fixed" | "decreasing";
}

const FamilyLoanSection = ({ details }: { details: FamilyLoanDetails }) => (
  <div className="mt-8">
    <h3 className="text-xl font-semibold mb-3">Chi tiết vay gia đình/người thân</h3>
    <div className="bg-slate-800/50 p-4 rounded-lg">
      <ul className="space-y-2 text-sm">
        <li className="flex justify-between">
          <span className="text-slate-400">Số tiền vay:</span>
          <span className="font-medium">{formatNumber(details.amount)} triệu</span>
        </li>
        <li className="flex justify-between">
          <span className="text-slate-400">Hình thức trả:</span>
          <span className="font-medium">{details.repaymentType}</span>
        </li>
        {details.interestRate !== undefined && (
          <li className="flex justify-between">
            <span className="text-slate-400">Lãi suất:</span>
            <span className="font-medium">{details.interestRate}%/năm</span>
          </li>
        )}
        {details.termYears !== undefined && (
          <li className="flex justify-between">
            <span className="text-slate-400">Thời hạn trả:</span>
            <span className="font-medium">{details.termYears} năm</span>
          </li>
        )}
        {details.repaymentType === "Trả dần hàng tháng" && (
           <li className="flex justify-between">
             <span className="text-slate-400">Trả hàng tháng (dự kiến):</span>
             <span className="font-medium">{formatNumber(details.monthlyPayment)} triệu</span>
           </li>
        )}
        {details.repaymentType === "Trả một cục khi có đủ khả năng" && (
          <li className="pt-2 border-t border-slate-700/50">
            <p className="text-xs text-slate-400 text-center italic">
              Khoản vay này là một khoản nợ trong tài sản của bạn, không được tính vào dòng tiền trả lãi hàng tháng để tối ưu khả năng vay ngân hàng.
            </p>
          </li>
        )}
      </ul>
    </div>
  </div>
);

export function RepaymentScheduleSection({
  amortizationSchedule,
  familyLoanDetails,
  loanTermYears,
  paymentMethod,
}: RepaymentScheduleProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const { monthlySchedule, yearlySchedule, summary } = amortizationSchedule;
  
  const firstTwoYearsSchedule = monthlySchedule.slice(0, 24);
  const lastYearSchedule = monthlySchedule.slice(-12);
  const loanTermMonths = loanTermYears * 12;
  const showLastYear = loanTermMonths > 24;
  const loanTermDisplay = `${loanTermYears} năm`;
  const paymentMethodDisplay = paymentMethod === 'fixed' ? "cố định (niên kim)" : "giảm dần";
  
  const totalPayment = yearlySchedule.reduce((acc, curr) => acc + curr.totalPayment, 0);
  const totalInterest = yearlySchedule.reduce((acc, curr) => acc + curr.totalInterest, 0);
  const totalPrincipal = totalPayment - totalInterest;
  const firstMonthPayment = summary.monthlyPayment;
  const lastMonthPayment = summary.lastMonthPayment;
  
  return (
    <div className="space-y-4">
      <div className="mt-6">
        <h3 className="text-xl font-semibold">Lịch trả nợ Ngân hàng</h3>
      </div>
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
                Khoản vay: {formatNumber(totalPrincipal)} triệu • Thời hạn: {loanTermDisplay} • Phương pháp: {paymentMethodDisplay}
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
                        {yearlySchedule.map((row) => (
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
                        <span className="font-medium">{formatNumber(totalPrincipal)} triệu</span>
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
                        <span className="text-slate-400">
                          {paymentMethod === 'fixed' ? 'Trả góp hàng tháng' : 'Trả góp tháng đầu'}:
                        </span>
                        <span className="font-medium">{formatNumber(firstMonthPayment)} triệu</span>
                      </li>
                      {paymentMethod === 'decreasing' && lastMonthPayment !== undefined && (
                        <li className="flex justify-between">
                          <span className="text-slate-400">Trả góp tháng cuối:</span>
                          <span className="font-medium">{formatNumber(lastMonthPayment)} triệu</span>
                        </li>
                      )}
                      <li className="flex justify-between">
                        <span className="text-slate-400">Tổng tiền lãi:</span>
                        <span className="font-medium">{formatNumber(totalInterest)} triệu</span>
                      </li>
                      <li className="flex justify-between border-t border-slate-700 pt-2 mt-2">
                        <span className="text-slate-400">Tổng chi phí:</span>
                        <span className="font-medium">{formatNumber(totalPayment)} triệu</span>
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
              <span className="font-medium">{formatNumber(totalPrincipal)} triệu</span>
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
        
        <div className="bg-slate-800/50 p-4 rounded-lg">
          <h4 className="font-medium mb-2">Tổng kết chi phí</h4>
          <ul className="space-y-1 text-sm">
            <li className="flex justify-between">
              <span className="text-slate-400">
                {paymentMethod === 'fixed' ? 'Trả góp hàng tháng' : 'Trả góp tháng đầu'}:
              </span>
              <span className="font-medium">{formatNumber(firstMonthPayment)} triệu</span>
            </li>
            {paymentMethod === 'decreasing' && lastMonthPayment !== undefined && (
              <li className="flex justify-between">
                <span className="text-slate-400">Trả góp tháng cuối:</span>
                <span className="font-medium">{formatNumber(lastMonthPayment)} triệu</span>
              </li>
            )}
            <li className="flex justify-between">
              <span className="text-slate-400">Tổng tiền lãi:</span>
              <span className="font-medium">{formatNumber(totalInterest)} triệu</span>
            </li>
            <li className="flex justify-between border-t border-slate-700 pt-2 mt-2">
              <span className="text-slate-400">Tổng chi phí:</span>
              <span className="font-medium">{formatNumber(totalPayment)} triệu</span>
            </li>
          </ul>
        </div>
      </div>
      
      {familyLoanDetails && <FamilyLoanSection details={familyLoanDetails} />}
    </div>
  );
}
