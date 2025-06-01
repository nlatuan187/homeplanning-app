"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProjectionRow } from "@/lib/calculations/affordability";
import { useRouter } from "next/navigation";
import { confirmPurchaseYear } from "@/actions";
// Accordion components removed
import { CheckIcon } from "lucide-react";

interface ResultsScenarioBProps {
  planId: string;
  targetYear: number; // This is the user's original target year from the plan
  firstViableYear: number;
  projectionData: ProjectionRow[];
  planLoanInterestRate: number;
  planLoanTermMonths: number;
}

export default function ResultsScenarioB({
  planId,
  targetYear,
  firstViableYear,
  projectionData,
  planLoanInterestRate,
  planLoanTermMonths
}: ResultsScenarioBProps) {
  const router = useRouter();
  const [isConfirming, setIsConfirming] = useState(false);
  const [selectedYearState, setSelectedYearState] = useState<number>(firstViableYear);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  // accordionValue state removed

  // Get all viable years for the list
  const viableYears = projectionData
    .filter(p => p.isAffordable && p.year >= firstViableYear)
    .slice(0, 5); // Limit to 5 years for simplicity

  const handleConfirm = async () => {
    setIsConfirming(true);
    setError(null);
    try {
      const result = await confirmPurchaseYear(planId, selectedYearState);
      if (!result.success) {
        throw new Error(result.error || "Failed to confirm purchase year");
      }
      // Redirect to financial-peace page upon successful confirmation
      router.push(`/plan/${planId}/financial-peace`);
    } catch (error) {
      console.error("Error confirming purchase year:", error);
      setError(error instanceof Error ? error.message : "An unknown error occurred");
    } finally {
      setIsConfirming(false);
    }
  };

  const selectedYearProjection = projectionData.find(p => p.year === selectedYearState)!;

  // Detailed explanation view
  if (showDetails) {
    const currentYear = new Date().getFullYear();
    // Ensure selectedYearProjection is available. If not, it might indicate an issue.
    if (!selectedYearProjection) {
      return (
        <div className="w-full space-y-4 p-4 bg-black text-white"> {/* Removed max-w classes */}
          <p>Lỗi: Không tìm thấy dữ liệu dự báo cho năm đã chọn.</p>
          <Button onClick={() => setShowDetails(false)} variant="outline" className="bg-slate-700 hover:bg-slate-600">
            Quay lại
          </Button>
        </div>
      );
    }

    // Calculations for display - ensure these match the design's logic
    const displayYear = selectedYearState; // The year being explained
    const currentYearProjection = projectionData.find(p => p.year === currentYear);

    const formatToLocaleOneDecimal = (value: number) => {
      return parseFloat(value.toFixed(1)).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    };
    const formatToNumberOneDecimal = (value: number) => {
      return parseFloat(value.toFixed(1));
    };

    // Income components for the selected/display year (monthly, one decimal)
    const luongNamMucTieu = formatToNumberOneDecimal(selectedYearProjection.primaryIncome / 12);
    const thuNhapVoChongNamMucTieu = formatToNumberOneDecimal(selectedYearProjection.spouseIncome / 12);
    const thuNhapKhacNamMucTieu = formatToNumberOneDecimal(selectedYearProjection.otherIncome / 12);
    const tongThuThangDisplay = formatToNumberOneDecimal(selectedYearProjection.annualIncome / 12);

    // Income components for the current year (monthly, one decimal for display consistency, annual as is)
    const luongHienTaiThang = formatToNumberOneDecimal((currentYearProjection?.primaryIncome || 0) / 12);
    const luongHienTaiNam = Math.round(currentYearProjection?.primaryIncome || 0);
    const thuNhapKhacHienTaiThang = formatToNumberOneDecimal((currentYearProjection?.otherIncome || 0) / 12);
    const thuNhapKhacHienTaiNam = Math.round(currentYearProjection?.otherIncome || 0);

    const mucTangLuong = selectedYearProjection.pctSalaryGrowth;

    // Expense components (monthly, one decimal)
    const chiPhiHienTaiThang = formatToNumberOneDecimal((currentYearProjection?.annualExpenses || 0) / 12);
    const chiPhiHienTaiNam = Math.round(currentYearProjection?.annualExpenses || 0);
    const mucTangChiPhi = selectedYearProjection.pctExpenseGrowth;
    const chiPhiSinhHoatNamMucTieu = formatToNumberOneDecimal(selectedYearProjection.annualExpenses / 12);

    const soTienVay = Math.round(selectedYearProjection.loanAmountNeeded); // Keep as integer for "triệu"
    const tienTraGopHangThang = formatToNumberOneDecimal(selectedYearProjection.monthlyPayment);
    const tongChiThang = formatToNumberOneDecimal(chiPhiSinhHoatNamMucTieu + tienTraGopHangThang); // Recalculate sum with one decimal
    const ketLuanBuffer = formatToNumberOneDecimal(selectedYearProjection.buffer);

    return (
      <div className="w-full space-y-6 p-4 bg-black text-slate-100"> {/* Removed max-w classes */}
        <div className="flex items-center mb-4">
          <Button
            variant="ghost"
            className="mr-2 p-2 text-slate-300 hover:bg-slate-700"
            onClick={() => setShowDetails(false)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </Button>
          <h1 className="text-xl md:text-2xl font-semibold text-center flex-1">GIẢI THÍCH KẾT QUẢ</h1>
        </div>

        <div className="bg-green-500/10 p-3 md:p-4 rounded-lg text-center">
          <p className="font-medium text-green-300 text-base md:text-lg">
            <CheckIcon className="inline h-5 w-5 md:h-6 md:w-6 mr-1" /> Tại sao bạn có thể mua nhà vào năm {displayYear}?
          </p>
        </div>

        {/* Tổng thu */}
        <div className="space-y-3 p-1 md:p-2">
          <h2 className="text-lg md:text-xl font-semibold">Tổng thu <span className="text-sm md:text-base font-normal text-slate-400">(thu nhập từ công việc chính + thu nhập khác)</span></h2>
          <div className="text-sm md:text-base space-y-1 text-slate-300">
            <div className="flex justify-between"><span>Lương hiện tại:</span> <span className="text-slate-100">{formatToLocaleOneDecimal(luongHienTaiThang)} triệu/tháng → {luongHienTaiNam.toLocaleString()} triệu/năm</span></div>
            <div className="flex justify-between"><span>Mức tăng lương:</span> <span className="text-slate-100">{mucTangLuong}%/năm</span></div>
            <div className="flex justify-between"><span>Lương năm {displayYear}:</span> <span style={{color: '#00ACB8'}} className="font-semibold">{formatToLocaleOneDecimal(luongNamMucTieu)} triệu/tháng</span></div>
            
            {/* Always show spouse income line, even if 0 */}
            <hr className="border-slate-700 my-1" />
            <div className="flex justify-between"><span>Thu nhập vợ/chồng năm {displayYear}:</span> <span style={{color: '#00ACB8'}} className="font-semibold">{formatToLocaleOneDecimal(thuNhapVoChongNamMucTieu)} triệu/tháng</span></div>

            <hr className="border-slate-700 my-1" />
            <div className="flex justify-between"><span>Thu nhập khác hiện tại:</span> <span className="text-slate-100">{formatToLocaleOneDecimal(thuNhapKhacHienTaiThang)} triệu/tháng → {thuNhapKhacHienTaiNam.toLocaleString()} triệu/năm</span></div>
            <div className="flex justify-between"><span>Mức tăng thu nhập khác:</span> <span className="text-slate-100">0%/năm</span></div>
            <div className="flex justify-between"><span>Thu nhập khác năm {displayYear}:</span> <span style={{color: '#00ACB8'}} className="font-semibold">{formatToLocaleOneDecimal(thuNhapKhacNamMucTieu)} triệu/tháng</span></div>
          </div>
          <div className="bg-slate-800 p-3 rounded-md text-center"> {/* Changed to bg-slate-800 */}
            <p className="font-medium">
              Tổng thu = {formatToLocaleOneDecimal(luongNamMucTieu)}
              {' + '}{formatToLocaleOneDecimal(thuNhapVoChongNamMucTieu)} (V/C)
              {' + '}{formatToLocaleOneDecimal(thuNhapKhacNamMucTieu)} (Khác)
              {' = '}{formatToLocaleOneDecimal(tongThuThangDisplay)} triệu/tháng
            </p>
          </div>
        </div>

        {/* Tổng chi */}
        <div className="space-y-3 p-1 md:p-2">
          <h2 className="text-lg md:text-xl font-semibold">Tổng chi <span className="text-sm md:text-base font-normal text-slate-400">(chi phí sinh hoạt + tiền trả góp vay mua nhà)</span></h2>
          <div className="text-sm md:text-base space-y-1 text-slate-300">
            <div className="flex justify-between"><span>Chi phí hiện tại:</span> <span className="text-slate-100">{formatToLocaleOneDecimal(chiPhiHienTaiThang)} triệu/tháng → {chiPhiHienTaiNam.toLocaleString()} triệu/năm</span></div>
            <div className="flex justify-between"><span>Mức tăng chi phí:</span> <span className="text-slate-100">{mucTangChiPhi}%/năm</span></div>
            <div className="flex justify-between"><span>Chi phí năm {displayYear}:</span> <span style={{color: '#00ACB8'}} className="font-semibold">{formatToLocaleOneDecimal(chiPhiSinhHoatNamMucTieu)} triệu/tháng</span></div>
            <hr className="border-slate-700 my-1" />
            <div className="flex justify-between"><span>Số tiền vay để mua nhà:</span> <span className="text-slate-100">{soTienVay.toLocaleString()} triệu</span></div>
            {/* Values for interest rate and term now come from plan props */}
            <div className="flex justify-between"><span>Lãi suất vay:</span> <span className="text-slate-100">{planLoanInterestRate}%/năm</span></div>
            <div className="flex justify-between"><span>Thời hạn vay:</span> <span className="text-slate-100">{planLoanTermMonths / 12} năm</span></div>
            <div className="flex justify-between"><span>Tiền trả góp hàng tháng:</span> <span style={{color: '#00ACB8'}} className="font-semibold">{formatToLocaleOneDecimal(tienTraGopHangThang)} triệu/tháng</span></div>
          </div>
          <div className="bg-slate-800 p-3 rounded-md text-center"> {/* Changed to bg-slate-800 */}
            <p className="font-medium">Tổng chi = {formatToLocaleOneDecimal(chiPhiSinhHoatNamMucTieu)} + {formatToLocaleOneDecimal(tienTraGopHangThang)} = {formatToLocaleOneDecimal(tongChiThang)} triệu/tháng</p>
          </div>
        </div>
        
        {/* Kết luận */}
        <div className="bg-green-500/20 p-4 rounded-lg text-sm md:text-base">
          <p className="font-semibold text-green-300 mb-1">Kết luận:</p>
          <p className="text-slate-200">
            Tổng thu là {formatToLocaleOneDecimal(tongThuThangDisplay)} triệu/tháng, lớn hơn tổng chi là {formatToLocaleOneDecimal(tongChiThang)} triệu/tháng, đồng nghĩa hàng tháng bạn vẫn còn dư <span className="font-semibold text-green-300">{formatToLocaleOneDecimal(ketLuanBuffer)} triệu</span> để chi tiêu và trả nợ.
          </p>
        </div>

        {/* Bảng dự báo */}
        <div className="space-y-2">
            <p className="text-sm md:text-base text-slate-400">
              Dựa trên cách tính đó, trong trường hợp không có sự thay đổi đáng kể về tình hình tài chính, bắt đầu từ năm <span className="font-semibold text-green-300">{firstViableYear}</span> trở đi, bạn đã có thể mua được nhà.
            </p>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs md:text-sm text-slate-300">
                <thead className="bg-slate-800"><tr>{/* Changed to bg-slate-800 */}
                    <th className="py-2 px-2 text-left font-medium">Năm</th>
                    <th className="py-2 px-2 text-right font-medium">Tổng Thu</th>
                    <th className="py-2 px-2 text-center font-medium">So sánh</th>
                    <th className="py-2 px-2 text-right font-medium">Tổng Chi</th>
                    <th className="py-2 px-2 text-center font-medium">Khả năng mua nhà</th>
                  </tr></thead>
                <tbody className="divide-y divide-slate-700">
                  {projectionData.slice(0, Math.max(5, viableYears.length, projectionData.findIndex(p => p.year === displayYear) + 2)).map((row) => {
                    const rowTongThu = Math.round(row.annualIncome / 12);
                    const rowTongChi = Math.round(row.annualExpenses / 12 + row.monthlyPayment);
                    const soSanh = rowTongThu > rowTongChi ? ">" : rowTongThu < rowTongChi ? "<" : "=";
                    const khaNang = row.isAffordable;
                    return (
                      <tr key={row.year} className={`${row.year === displayYear ? "bg-slate-700/50" : ""}`}>
                        <td className="py-2 px-2">{row.year}</td>
                        <td className="py-2 px-2 text-right">{rowTongThu.toLocaleString()}</td>
                        <td className={`py-2 px-2 text-center font-semibold ${soSanh === ">" ? "text-green-400" : soSanh === "<" ? "text-red-400" : ""}`}>{soSanh}</td>
                        <td className="py-2 px-2 text-right">{rowTongChi.toLocaleString()}</td>
                        <td className={`py-2 px-2 text-center font-semibold ${khaNang ? "text-green-400" : "text-red-400"}`}>{khaNang ? '✓' : '✗'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
        </div>
      </div>
    );
  }

  // Initial View (where Accordion was removed)
  return (
    <div className="w-full space-y-4 p-4 bg-black"> {/* Removed max-w classes, parent page will control max-width */}
      <Card className="bg-slate-900 text-white shadow-lg rounded-xl">
        <CardContent className="p-6">
          <div className="flex items-start space-x-3">
            <CheckIcon className="h-6 w-6 text-green-400 mt-1 shrink-0" />
            <div className="flex-1">
              <h2 className="text-lg md:text-xl font-semibold text-green-400">Kế hoạch mua nhà có khả thi</h2>
              <p className="mt-1 text-sm md:text-base text-slate-300">
                Bắt đầu từ năm {firstViableYear}, bạn đã có đủ khả năng tài chính để mua được nhà.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDetails(true)}
                className="mt-4 bg-slate-700 border-slate-600 hover:bg-slate-600 text-slate-200 px-3 py-1.5 text-xs md:text-sm"
              >
                Giải thích lý do →
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Year Selection Section - Accordion Removed, direct display */}
      <div className="mt-6 space-y-4">
        <h3 className="text-md md:text-lg font-semibold text-slate-100 text-center">Chọn năm mua nhà bạn mong muốn:</h3>
        <div className="space-y-3">
          {viableYears.map((yearData) => {
            const loanRatioPct = yearData.housePriceProjected > 0 ? Math.round((yearData.loanAmountNeeded / yearData.housePriceProjected) * 100) : 0;


                const isFirstViable = yearData.year === firstViableYear;
                // targetYear is the original user's target, not the firstViableYear or selectedYearState
                const isOriginalTarget = yearData.year === targetYear;
                const isSelected = selectedYearState === yearData.year;

                return (
                  <div
                    key={yearData.year}
                    className={`rounded-lg p-4 cursor-pointer transition-colors ${
                      isSelected ? 'bg-slate-700' : 'bg-slate-900 hover:bg-slate-700/50'
                    }`}
                    onClick={() => setSelectedYearState(yearData.year)}
                  >
                    <div className="flex items-center mb-2">
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center mr-3 shrink-0 ${
                          isSelected ? 'bg-green-500 border-green-500' : 'border-slate-500'
                        }`}
                      >
                        {isSelected && <CheckIcon className="w-3 h-3 text-black" />}
                      </div>
                      <span className="font-medium text-base text-slate-100">
                        Mua nhà năm {yearData.year}
                      </span>
                      <div className="ml-auto flex space-x-2">
                        {isFirstViable && (
                          <span className="text-xs px-2 py-0.5 bg-blue-500/30 text-blue-300 rounded-full whitespace-nowrap">
                            Mua nhà sớm nhất
                          </span>
                        )}
                        {isOriginalTarget && (
                          <span className="text-xs px-2 py-0.5 bg-sky-500/30 text-sky-300 rounded-full whitespace-nowrap">
                            Dự kiến ban đầu
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm pl-8">
                      <div>
                        <p className="text-slate-400">Giá nhà:</p>
                        <p className="text-slate-200">{Math.round(yearData.housePriceProjected).toLocaleString()} triệu</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Trả góp:</p>
                        <p className="text-slate-200">{Math.round(yearData.monthlyPayment).toLocaleString()} tr/tháng</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Tỷ lệ vay:</p>
                        <p className="text-slate-200">{loanRatioPct}%</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Còn dư:</p>
                        <p className="text-green-400">
                          {Math.round(yearData.buffer).toLocaleString()} tr/tháng
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div> {/* Closes div className="space-y-3" which wraps the .map() */}

            {/* Conditional error display - ensuring this block is cleanly separated */}
            {error && (
              <div className="p-4 text-red-400 bg-red-900/30 text-sm mt-3">
                {error}
              </div>
            )}
            {/* End of conditional error display */}

            {/* Confirmation button section - ensuring this block starts cleanly */}
            <div className="mt-4">
              <Button
                onClick={handleConfirm}
                disabled={isConfirming}
                className="w-full bg-white text-black hover:bg-slate-200 text-base md:text-lg font-semibold py-3 rounded-lg"
              >
                {isConfirming ? "Đang xác nhận..." : `Xác nhận mua nhà năm ${selectedYearState}`}
              </Button>
            </div>
      </div> {/* Closes div className="w-full space-y-4 p-4 bg-black" */}
    </div> /* Closes main return div for ResultsScenarioB component */
  );
}
