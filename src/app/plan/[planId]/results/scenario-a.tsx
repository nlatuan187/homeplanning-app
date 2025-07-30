"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProjectionRow } from "@/lib/calculations/affordability";
import { editPlan } from "@/actions";
import { AlertTriangle } from "lucide-react"; // CheckIcon removed
import { Plan } from "@prisma/client";

interface ResultsScenarioAProps {
  plan: Plan;
  targetYear: number; // This is the user's original target year from the plan
  projection: ProjectionRow; // This is the projection for the targetYear
  firstViableYear: number | null;
  projectionData: ProjectionRow[];
  planLoanInterestRate: number;
  planLoanTermYears: number; // Changed from planLoanTermMonths
}

// Helper function to calculate additional savings needed for Scenario A
export function calculateAdditionalSavingsForViability(
  targetYearProjection: ProjectionRow,
  loanInterestRateAnnual: number, // e.g., 11 for 11%
  loanTermYears: number // Changed from loanTermMonths
): number {
  const monthlyIncomeTargetYear = targetYearProjection.annualIncome / 12;
  // annualExpenses in ProjectionRow is pre-mortgage living expenses
  const monthlyLivingExpensesTargetYear = targetYearProjection.annualExpenses / 12;

  const loanTermMonths = loanTermYears * 12; // Calculate months from years

  // Max affordable monthly mortgage payment (with 0 buffer)
  const maxAffordableMonthlyMortgage = monthlyIncomeTargetYear - monthlyLivingExpensesTargetYear;

  let additionalSavings: number;

  if (maxAffordableMonthlyMortgage <= 0) {
    // Income doesn't even cover living expenses. User needs to save for the entire house price
    // relative to their current savings path, or fundamentally change income/expenses.
    // The "additional savings" here means what's lacking to buy the house if no loan was viable due to cash flow.
    additionalSavings = targetYearProjection.housePriceProjected - targetYearProjection.cumulativeSavings;
  } else {
    const monthlyInterestRate = loanInterestRateAnnual / 100 / 12;
    let maxLoanAmount = 0;
    if (monthlyInterestRate > 0) {
      maxLoanAmount = maxAffordableMonthlyMortgage * 
                      (1 - Math.pow(1 + monthlyInterestRate, -loanTermMonths)) / 
                      monthlyInterestRate;
    } else { // Edge case: 0% interest loan
      maxLoanAmount = maxAffordableMonthlyMortgage * loanTermMonths;
    }
    maxLoanAmount = Math.max(0, maxLoanAmount); // Ensure loan amount isn't negative

    const housePrice = targetYearProjection.housePriceProjected;
    const minDownPaymentNeeded = Math.max(0, housePrice - maxLoanAmount);
    const currentSavingsAtTargetYear = targetYearProjection.cumulativeSavings;
    additionalSavings = minDownPaymentNeeded - currentSavingsAtTargetYear;
  }
  
  return Math.round(Math.max(0, additionalSavings)); // Return rounded, non-negative
}

export default function ResultsScenarioA({
  plan,
  targetYear,
  projection, // projection for the targetYear
  firstViableYear,
  projectionData,
  planLoanInterestRate,
  planLoanTermYears
}: ResultsScenarioAProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const additionalSavingsNeeded = calculateAdditionalSavingsForViability(
    projection,
    planLoanInterestRate,
    planLoanTermYears
  );

  const handleEdit = async () => {
    setIsEditing(true);
    try {
      // Redirect to the 'goal' section of the plan editing form
      await editPlan(plan.id, undefined, "goal");
    } catch (error) {
      console.error("Error editing plan:", error);
      setIsEditing(false);
    }
  };
  
  const recommendations = [
    { title: "Tìm thêm nguồn thu nhập:", description: "Tìm kiếm nguồn thu nhập bổ sung như đầu tư, làm thêm công việc ngoài, sự hỗ trợ tài chính từ gia đình,..." },
    { title: "Lập gia đình sớm hơn:", description: "Nếu bạn chưa lập gia đình, việc kết hôn sẽ giúp tăng thu nhập chung của hộ gia đình." },
    { title: "Giảm giá trị căn nhà:", description: "Cân nhắc mua căn nhà có giá trị thấp hơn hoặc ở khu vực khác có giá cả phải chăng hơn." },
    { title: "Giảm chi tiêu hàng tháng:", description: "Xem xét lại các khoản chi tiêu để tiết kiệm và tích lũy nhiều hơn." },
    { title: "Trả góp cố định thay vì giảm dần:", description: "Trả góp cố định có số tiền phải trả vào tháng đầu tiên thấp hơn so với trả góp giảm dần." },
  ];


  // Detailed explanation view (D2.2)
  if (showDetails) {
    const currentYear = new Date().getFullYear();
    const displayYear = targetYear; // For Scenario A, we explain for the original target year
    const targetYearProjection = projection; // Use the passed projection for the target year

    // Calculations for display
    const currentYearProjection = projectionData.find(p => p.year === currentYear);

    const formatToLocaleOneDecimal = (value: number) => {
      return parseFloat(value.toFixed(1)).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    };
    const formatToNumberOneDecimal = (value: number) => {
      return parseFloat(value.toFixed(1));
    };


    // Income components for the target year (monthly, one decimal)
    const luongNamMucTieu = formatToNumberOneDecimal(targetYearProjection.primaryIncome / 12);
    const thuNhapVoChongNamMucTieu = formatToNumberOneDecimal(targetYearProjection.spouseIncome / 12);
    const thuNhapKhacNamMucTieu = formatToNumberOneDecimal(targetYearProjection.otherIncome / 12);
    const tongThuThangDisplay = formatToNumberOneDecimal(targetYearProjection.annualIncome / 12);

    // Income components for the current year (monthly, one decimal for display consistency if needed later, annual as is)
    const luongHienTaiThang = formatToNumberOneDecimal((currentYearProjection?.primaryIncome || 0) / 12);
    const luongHienTaiNam = Math.round(currentYearProjection?.primaryIncome || 0); // Annual can remain rounded for this display
    const thuNhapKhacHienTaiThang = formatToNumberOneDecimal((currentYearProjection?.otherIncome || 0) / 12);
    const thuNhapKhacHienTaiNam = Math.round(currentYearProjection?.otherIncome || 0); // Annual can remain rounded
    
    const mucTangLuong = targetYearProjection.pctSalaryGrowth;

    // Expense components (monthly, one decimal)
    const chiPhiHienTaiThang = formatToNumberOneDecimal((currentYearProjection?.annualExpenses || 0) / 12);
    const chiPhiHienTaiNam = Math.round(currentYearProjection?.annualExpenses || 0); // Annual can remain rounded
    const mucTangChiPhi = targetYearProjection.pctExpenseGrowth;
    const chiPhiSinhHoatNamMucTieu = formatToNumberOneDecimal(targetYearProjection.annualExpenses / 12);

    const soTienVayNganHang = Math.round(targetYearProjection.loanAmountNeeded);
    
    // Updated logic to correctly access nested familySupport object
    const familySupport = plan.familySupport;
    const soTienVayGiaDinh = 
        (familySupport?.familySupportType === 'LOAN' && (familySupport.familySupportAmount ?? 0) > 0)
        ? Math.round(familySupport.familySupportAmount!) 
        : 0;

    const familyGiftAtPurchase = 
        (familySupport?.familySupportType === 'GIFT' && familySupport.familyGiftTiming === 'AT_PURCHASE' && (familySupport.familySupportAmount ?? 0) > 0)
        ? Math.round(familySupport.familySupportAmount!)
        : 0;

    const tienTraGopHangThang = formatToNumberOneDecimal(targetYearProjection.monthlyPayment);
    const traNoGiaDinhHangThang = targetYearProjection.familyLoanRepayment / 12;
    const tongChiThang = formatToNumberOneDecimal(chiPhiSinhHoatNamMucTieu + tienTraGopHangThang + traNoGiaDinhHangThang);
    const ketLuanBuffer = formatToNumberOneDecimal(targetYearProjection.buffer);


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

        <div className="bg-red-500/10 p-3 md:p-4 rounded-lg text-center">
          <p className="font-medium text-red-300 text-base md:text-lg">
            <AlertTriangle className="inline h-5 w-5 md:h-6 md:w-6 mr-1" /> Tại sao bạn chưa thể mua nhà vào năm {displayYear}?
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
            <div className="flex justify-between"><span>Mức tăng thu nhập khác:</span> <span className="text-slate-100">0%/năm</span></div> {/* Assuming 0% growth for other income as per design */}
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
          <h2 className="text-lg md:text-xl font-semibold">Tổng chi <span className="text-sm md:text-base font-normal text-slate-400">(chi phí sinh hoạt + trả góp NH + trả nợ GĐ)</span></h2>
          <div className="text-sm md:text-base space-y-1 text-slate-300">
            <div className="flex justify-between"><span>Chi phí hiện tại:</span> <span className="text-slate-100">{formatToLocaleOneDecimal(chiPhiHienTaiThang)} triệu/tháng → {chiPhiHienTaiNam.toLocaleString()} triệu/năm</span></div>
            <div className="flex justify-between"><span>Mức tăng chi phí:</span> <span className="text-slate-100">{mucTangChiPhi}%/năm</span></div>
            <div className="flex justify-between"><span>Chi phí năm {displayYear}:</span> <span style={{color: '#00ACB8'}} className="font-semibold">{formatToLocaleOneDecimal(chiPhiSinhHoatNamMucTieu)} triệu/tháng</span></div>
            <hr className="border-slate-700 my-1" />
            <div className="flex justify-between"><span>Số tiền vay ngân hàng:</span> <span className="text-slate-100">{soTienVayNganHang.toLocaleString()} triệu</span></div>
            {familyGiftAtPurchase > 0 && (
              <div className="flex justify-between">
                <span>Hỗ trợ từ gia đình (Quà tặng):</span> 
                <span className="text-slate-100">{familyGiftAtPurchase.toLocaleString()} triệu</span>
              </div>
            )}
            {soTienVayGiaDinh > 0 && (
              <div className="flex justify-between"><span>Số tiền vay gia đình:</span> <span className="text-slate-100">{soTienVayGiaDinh.toLocaleString()} triệu</span></div>
            )}
            <div className="flex justify-between"><span>Lãi suất vay:</span> <span className="text-slate-100">{planLoanInterestRate}%/năm</span></div>
            <div className="flex justify-between"><span>Thời hạn vay:</span> <span className="text-slate-100">{planLoanTermYears} năm</span></div>
            <div className="flex justify-between"><span>Tiền trả góp hàng tháng:</span> <span style={{color: '#00ACB8'}} className="font-semibold">{formatToLocaleOneDecimal(tienTraGopHangThang)} triệu/tháng</span></div>
          </div>
          <div className="bg-slate-800 p-3 rounded-md text-center"> {/* Changed to bg-slate-800 */}
            <p className="font-medium">Tổng chi = {formatToLocaleOneDecimal(chiPhiSinhHoatNamMucTieu)} + {formatToLocaleOneDecimal(tienTraGopHangThang)} + {formatToLocaleOneDecimal(traNoGiaDinhHangThang)} = {formatToLocaleOneDecimal(tongChiThang)} triệu/tháng</p>
          </div>
        </div>
        
        {/* Kết luận */}
        <div className="bg-red-500/20 p-4 rounded-lg text-sm md:text-base border border-red-500/50">
          <p className="font-semibold text-red-300 mb-1">Kết luận:</p>
          <p className="text-slate-200">
            Tổng thu là {formatToLocaleOneDecimal(tongThuThangDisplay)} triệu/tháng, {tongThuThangDisplay <= tongChiThang ? "nhỏ hơn hoặc bằng" : "lớn hơn"} tổng chi là {formatToLocaleOneDecimal(tongChiThang)} triệu/tháng, đồng nghĩa hàng tháng bạn {ketLuanBuffer < 0 ? `thâm hụt ${formatToLocaleOneDecimal(Math.abs(ketLuanBuffer))} triệu.` : `chỉ còn dư ${formatToLocaleOneDecimal(ketLuanBuffer)} triệu, không đủ để tạo một khoản đệm an toàn.`}
          </p>
        </div>

        {/* Bảng dự báo */}
        <div className="space-y-2">
            <p className="text-sm md:text-base text-slate-400">
              {firstViableYear ? 
                `Dựa trên cách tính đó, trong trường hợp không có sự thay đổi đáng kể về tình hình tài chính, bắt đầu từ năm ${firstViableYear} trở đi, bạn đã có thể mua được nhà.` :
                "Dựa trên cách tính đó, trong trường hợp không có sự thay đổi đáng kể về tình hình tài chính, bạn chưa thể mua được nhà trong các năm tới với kế hoạch hiện tại."
              }
            </p>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs md:text-sm text-slate-300">
                <thead className="bg-slate-800"> {/* Changed to bg-slate-800 */}
                  <tr>
                    <th className="py-2 px-2 text-left font-medium">Năm</th>
                    <th className="py-2 px-2 text-right font-medium">Tổng Thu</th>
                    <th className="py-2 px-2 text-right font-medium">Tổng Chi</th>
                    <th className="py-2 px-2 text-right font-medium">Trả nợ GĐ</th>
                    <th className="py-2 px-2 text-center font-medium">Khả năng mua nhà</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {projectionData.slice(0, Math.max(5, projectionData.findIndex(p => p.year === displayYear) + 2, firstViableYear ? projectionData.findIndex(p => p.year === firstViableYear) + 2 : 5 )).map((row) => {
                    const rowTongThu = Math.round(row.annualIncome / 12);
                    // Total monthly expenses now include base living expenses, bank loan payment, and family loan repayment.
                    const rowTongChi = Math.round(row.annualExpenses / 12 + row.monthlyPayment + (row.familyLoanRepayment / 12));
                    const rowTraNoGD = Math.round(row.familyLoanRepayment / 12);
                    const khaNang = row.isAffordable;
                    return (
                      <tr key={row.year} className={`${row.year === displayYear ? "bg-slate-700/50" : ""}`}>
                        <td className="py-2 px-2">{row.year}</td>
                        <td className="py-2 px-2 text-right">{rowTongThu.toLocaleString()}</td>
                        <td className="py-2 px-2 text-right">{rowTongChi.toLocaleString()}</td>
                        <td className="py-2 px-2 text-right">{rowTraNoGD > 0 ? rowTraNoGD.toLocaleString() : "-"}</td>
                        <td className="py-2 px-2 text-center">
                          {khaNang ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5l-7 7 7 7"/></svg>
                          )}
                        </td>
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

  // Initial card with basic information (D1.2)
  return (
    <div className="w-full space-y-6 p-4 bg-black text-slate-100"> {/* Removed max-w classes */}
      <Card className="bg-slate-900 text-white shadow-lg rounded-xl">
        <CardContent className="p-6">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-6 w-6 text-red-400 mt-1 shrink-0" />
            <div className="flex-1">
              <h2 className="text-lg md:text-xl font-semibold text-red-400">Kế hoạch mua nhà chưa khả thi</h2>
              <p className="mt-1 text-sm md:text-base text-slate-300">
                Bạn chưa đủ khả năng tài chính để mua nhà vào năm {targetYear} như mong muốn.
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

      <div>
        {/* <h3 className="text-xl md:text-2xl font-semibold mb-2 text-slate-100">Khuyến nghị của chúng tôi</h3> */}
        <p className="text-lg md:text-xl font-medium mb-1" style={{color: '#34D0DB'}}>
          Bạn cần có thêm {additionalSavingsNeeded.toLocaleString()} triệu VNĐ vào quỹ tiết kiệm để có thể mua nhà vào năm {targetYear}.
        </p>
        <p className="text-sm md:text-base text-slate-400 mb-4">
          Tham khảo những cách sau để đạt được mục tiêu này:
        </p>
        <div className="space-y-3 md:grid md:grid-cols-2 md:gap-4">
          {recommendations.map((rec, index) => (
            <div key={index} className="bg-slate-800 p-4 rounded-lg">
              <h4 className="font-medium text-base md:text-lg text-slate-100">{rec.title}</h4>
              <p className="text-sm md:text-base mt-1 text-slate-300">{rec.description}</p>
            </div>
          ))}
        </div>
      </div>

      <Button
        onClick={handleEdit}
        disabled={isEditing}
        className="w-full bg-white text-black hover:bg-slate-200 text-sm font-medium py-3"
      >
        {isEditing ? "Đang chuyển hướng..." : "Thay đổi kế hoạch"}
      </Button>
    </div>
  );
}
