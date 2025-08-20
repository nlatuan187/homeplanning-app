// AddCashflowModal.tsx
"use client";

import React, { useState } from "react";
import { X } from "lucide-react";
import Image from "next/image";

export default function AddCashflowModal({
  open,
  onClose,
  onSubmit,
  monthlySurplus, // Thêm prop mới
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (description: string, amount: number) => void;
  monthlySurplus: number; // Thêm type cho prop
}) {
  const [type, setType] = useState<"in" | "out">("in");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  // State mới để lưu kết quả tính toán
  const [timeImpactInDays, setTimeImpactInDays] = useState(0);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // 1. Loại bỏ tất cả các ký tự không phải là số
    const numericValue = e.target.value.replace(/[^0-9]/g, "");

    // 2. Cập nhật state amount với giá trị số thuần túy
    setAmount(numericValue);
  };

  // Sử dụng useMemo để chỉ tính toán lại khi `amount` thay đổi
  const formattedAmountForDisplay = React.useMemo(() => {
    if (!amount) return "";
    const number = parseInt(amount, 10);
    return isNaN(number) ? "" : number.toLocaleString("en-US");
  }, [amount]);

  const handleSubmit = () => {
    if (!type || amount.trim() === "") return;

    const finalDescription =
      description.trim() === ""
        ? type === "in"
          ? "Dòng tiền vào"
          : "Dòng tiền ra"
        : description;

    // Sử dụng formattedAmountForDisplay để hiển thị trong câu xác nhận
    const sentence =
      type === "in"
        ? `Kiếm được thêm ${formattedAmountForDisplay} nhờ ${finalDescription}`
        : `Chi tiêu thêm ${formattedAmountForDisplay} do ${finalDescription}`;

    // Tính toán amount với dấu đúng (triệu VND)
    // Lưu ý: amountValue sẽ là số âm nếu là tiền ra, số dương nếu là tiền vào
    const amountValue = type === "in" ? Number(amount) / 1000000 : -(Number(amount) / 1000000);

    // Tính toán tác động về thời gian
    if (monthlySurplus > 0) {
      const days = Math.round((Math.abs(amountValue) / monthlySurplus) * 30);
      setTimeImpactInDays(days);
    } else {
      setTimeImpactInDays(0);
    }

    if (type === "in") {
      setShowSuccessModal(true);
    } else {
      setShowWarningModal(true);
    }

    // Gọi onSubmit với description và amountValue
    onSubmit(finalDescription, amountValue);
  };

  const handleCloseAll = () => {
    setShowSuccessModal(false);
    setShowWarningModal(false);
    setType("in");
    setDescription("");
    setAmount("");
    onClose();
  };

  return (
    <>
      {/* Main Modal */}
      {open && !showSuccessModal && !showWarningModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-md w-full max-w-md p-6 relative shadow-xl">
            <button
              onClick={onClose}
              className="absolute right-4 top-4 text-gray-500 hover:text-gray-800"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg text-black font-semibold text-center mb-4">Thêm dòng tiền mới</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả về dòng tiền</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ví dụ: Thưởng cuối năm của công ty"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tính chất dòng tiền</label>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    className={`flex-1 px-4 py-2 rounded-full border font-medium text-sm transition-all ${type === "in" ? "bg-cyan-500 text-white border-cyan-500" : "text-cyan-500 border-cyan-500 hover:bg-cyan-50"}`}
                    onClick={() => setType("in")}
                  >
                    Tiền vào +
                  </button>
                  <button
                    type="button"
                    className={`flex-1 px-4 py-2 rounded-full border font-medium text-sm transition-all ${type === "out" ? "bg-red-500 text-white border-red-500" : "text-gray-700 border-gray-400 hover:bg-gray-100"}`}
                    onClick={() => setType("out")}
                  >
                    Tiền ra -
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Số tiền (nhập số)</label>
                <input
                  type="text" // Đổi sang type="text"
                  inputMode="numeric" // Gợi ý bàn phím số trên di động
                  value={formattedAmountForDisplay} // Hiển thị giá trị đã định dạng
                  onChange={handleAmountChange} // Sử dụng hàm xử lý mới
                  placeholder="Ví dụ: 20,000,000"
                  className="w-full border border-gray-300 text-black placeholder:text-gray-400 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <button
                className="mt-6 w-full bg-black text-white rounded-lg py-2 text-sm font-semibold hover:bg-gray-900"
                onClick={handleSubmit}
              >
                Bổ sung
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-md w-full max-w-md p-6 text-center shadow-xl text-green-600 relative">
            <button
              onClick={handleCloseAll}
              className="absolute right-4 top-4 text-gray-500 hover:text-gray-800"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="text-xl font-bold mb-2">RẤT TỐT!</div>
            <div className="flex justify-center my-2">
              <Image src="/icons/confetti.png" alt="confetti" width={40} height={40} />
            </div>
            <div className="text-lg font-semibold mb-1">
              Kiếm thêm được <span className="text-green-600">{formattedAmountForDisplay}</span>
            </div>
            <p className="text-sm text-gray-600">
              Bạn sẽ mua được nhà sớm hơn kế hoạch {timeImpactInDays} ngày nếu duy trì dòng tiền vào này mỗi tháng.
            </p>
          </div>
        </div>
      )}

      {/* Warning Modal */}
      {showWarningModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-md w-full max-w-md p-6 text-center shadow-xl text-red-600 relative">
            <button
              onClick={handleCloseAll}
              className="absolute right-4 top-4 text-gray-500 hover:text-gray-800"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="text-xl font-bold mb-2">Ồ KHÔNG!</div>
            <div className="flex justify-center my-2">
              <Image src="/icons/snail.png" alt="snail" width={40} height={40} />
            </div>
            <div className="text-lg font-semibold mb-1">
              Chi tiêu thêm <span className="text-red-600">{formattedAmountForDisplay}</span>
            </div>
            <p className="text-sm text-gray-600">
              Bạn sẽ phải hoãn kế hoạch nhà {timeImpactInDays} ngày nếu tiếp tục khoản chi này trong những tháng tiếp theo.
            </p>
          </div>
        </div>
      )}
    </>
  );
}