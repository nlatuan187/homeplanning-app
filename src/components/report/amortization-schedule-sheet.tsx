"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface MonthlyScheduleItem {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  remainingBalance: number;
}

interface YearlyScheduleItem {
  year: number;
  totalPayment: number;
  totalPrincipal: number;
  totalInterest: number;
  remainingBalance: number;
}

interface AmortizationScheduleSheetProps {
  monthlySchedule?: MonthlyScheduleItem[];
  yearlySchedule?: YearlyScheduleItem[];
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const formatMillions = (value: number): string => {
  if (isNaN(value) || value === null || value === undefined) return "0";
  return (value).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

const AmortizationScheduleSheet: React.FC<AmortizationScheduleSheetProps> = ({
  monthlySchedule = [],
  yearlySchedule = [],
  isOpen,
  onOpenChange,
}) => {
  const [viewType, setViewType] = useState<"monthly" | "yearly">("monthly");

  const displayMonthlySchedule = () => {
    if (monthlySchedule.length <= 24) { // Show all if 2 years or less
      return monthlySchedule;
    }
    // Show first 12, ellipsis, last 12
    return [
      ...monthlySchedule.slice(0, 12),
      { month: -1, payment: 0, principal: 0, interest: 0, remainingBalance: 0 }, // Ellipsis row
      ...monthlySchedule.slice(-12),
    ];
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] flex flex-col bg-slate-900 text-slate-100 border-slate-700">
        <SheetHeader className="p-4 border-b border-slate-700">
          <SheetTitle className="text-center text-lg font-semibold text-slate-50">Bảng Kế hoạch Trả nợ</SheetTitle>
          <SheetDescription className="text-center text-sm text-slate-400">
            Chi tiết dòng tiền trả nợ hàng tháng và hàng năm.
          </SheetDescription>
        </SheetHeader>
        <div className="p-4 flex justify-center space-x-2">
          <Button 
            variant={viewType === 'monthly' ? 'default' : 'outline'} 
            onClick={() => setViewType('monthly')}
            className={viewType === 'monthly' ? 'bg-cyan-600 hover:bg-cyan-500' : 'border-slate-600 hover:bg-slate-700'}
          >
            Xem theo Tháng
          </Button>
          <Button 
            variant={viewType === 'yearly' ? 'default' : 'outline'} 
            onClick={() => setViewType('yearly')}
            className={viewType === 'yearly' ? 'bg-cyan-600 hover:bg-cyan-500' : 'border-slate-600 hover:bg-slate-700'}
          >
            Xem theo Năm
          </Button>
        </div>
        <div className="flex-grow overflow-y-auto p-1 text-xs md:text-sm">
          {viewType === "monthly" && (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700 hover:bg-slate-800">
                  <TableHead className="text-slate-300">Kỳ</TableHead>
                  <TableHead className="text-right text-slate-300">Gốc</TableHead>
                  <TableHead className="text-right text-slate-300">Lãi</TableHead>
                  <TableHead className="text-right text-slate-300">Tổng trả</TableHead>
                  <TableHead className="text-right text-slate-300">Dư nợ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayMonthlySchedule().map((item) =>
                  item.month === -1 ? (
                    <TableRow key="ellipsis" className="border-slate-700">
                      <TableCell colSpan={5} className="text-center text-slate-500 py-3">...</TableCell>
                    </TableRow>
                  ) : (
                    <TableRow key={item.month} className="border-slate-700 hover:bg-slate-800/50">
                      <TableCell>{item.month}</TableCell>
                      <TableCell className="text-right">{formatMillions(item.principal)}</TableCell>
                      <TableCell className="text-right">{formatMillions(item.interest)}</TableCell>
                      <TableCell className="text-right">{formatMillions(item.payment)}</TableCell>
                      <TableCell className="text-right">{formatMillions(item.remainingBalance)}</TableCell>
                    </TableRow>
                  )
                )}
              </TableBody>
            </Table>
          )}
          {viewType === "yearly" && (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700 hover:bg-slate-800">
                  <TableHead className="text-slate-300">Năm</TableHead>
                  <TableHead className="text-right text-slate-300">Tổng gốc</TableHead>
                  <TableHead className="text-right text-slate-300">Tổng lãi</TableHead>
                  <TableHead className="text-right text-slate-300">Tổng trả</TableHead>
                  <TableHead className="text-right text-slate-300">Dư nợ cuối năm</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {yearlySchedule.map((item) => (
                  <TableRow key={item.year} className="border-slate-700 hover:bg-slate-800/50">
                    <TableCell>{item.year}</TableCell>
                    <TableCell className="text-right">{formatMillions(item.totalPrincipal)}</TableCell>
                    <TableCell className="text-right">{formatMillions(item.totalInterest)}</TableCell>
                    <TableCell className="text-right">{formatMillions(item.totalPayment)}</TableCell>
                    <TableCell className="text-right">{formatMillions(item.remainingBalance)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
        <div className="p-4 border-t border-slate-700 mt-auto">
            <SheetClose asChild>
                <Button variant="outline" className="w-full border-slate-600 hover:bg-slate-700">Đóng</Button>
            </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default AmortizationScheduleSheet;
