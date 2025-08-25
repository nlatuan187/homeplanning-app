// components/TodoList.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import TodoItem, { TaskType } from "./TodoItem";
import AddCashflowModal from "./AddCashflowModal";
import MilestoneCompleted from "./MilestoneCompleted";
import { saveCustomTask } from "@/actions/milestoneProgress";
import { useDebounce } from "@/hooks/useDebounce";

// Định nghĩa một kiểu dữ liệu nội bộ để làm việc, bao gồm cả ID
export interface TodoItemWithId {
  id: string; // ID duy nhất và ổn định do chúng ta tự tạo ra
  text: string;
  type: TaskType;
  status: "incomplete" | "completed" | "auto-completed";
  amount?: number;
}

export interface TodoListProps {
  milestoneId: number;
  defaultItems: { text: string; type: TaskType; status: "incomplete" | "completed" | "auto-completed"; amount?: number }[];
  // BƯỚC 3.1: SỬA LẠI PROP
  onProgressUpdate?: (tasks: any[]) => Promise<any>;
  onSavingsUpdate?: (amount: number) => void;
  onMilestoneCompleted?: () => void;
  isMilestoneCompleted?: boolean;
  plan?: any; // Plan object
  currentMilestoneAmount?: number;
  previousMilestoneAmount?: number;
  planId: string;
  hasNextMilestone?: boolean;
  onGoToRoadmap?: () => void;
  isLastMilestone?: boolean;
  monthlySurplus: number; // <-- THÊM PROP NÀY
}

export default function TodoList({ 
  milestoneId, 
  defaultItems, 
  onProgressUpdate, // Nhận prop mới
  onSavingsUpdate, 
  onMilestoneCompleted,
  isMilestoneCompleted = false,
  plan,
  currentMilestoneAmount,
  previousMilestoneAmount,
  planId,
  hasNextMilestone = false,
  isLastMilestone = false, // Thêm prop mới
  monthlySurplus, // <-- NHẬN PROP NÀY
}: TodoListProps) {
  const [items, setItems] = useState(defaultItems);
  const [modalOpen, setModalOpen] = useState(false);
  const [showMilestoneCompleted, setShowMilestoneCompleted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); // State để báo hiệu đang lưu
  
  const rewardedTasksRef = useRef<Set<string>>(new Set());
  const isInitialMount = useRef(true);

  // BƯỚC 3.2: DEBOUNCE TOÀN BỘ DANH SÁCH ITEMS
  const debouncedItems = useDebounce(items, 1500);

  // Reset state khi defaultItems thay đổi
  useEffect(() => {
    setItems(defaultItems);
    // Quan trọng: reset isInitialMount để không lưu ngay khi chuyển milestone
    isInitialMount.current = true; 
  }, [defaultItems]);

  // BƯỚC 3.3: useEffect ĐỂ GỌI API KHI `debouncedItems` THAY ĐỔI
  useEffect(() => {
    // Bỏ qua lần render đầu tiên
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (onProgressUpdate) {
      const saveProgress = async () => {
        setIsProcessing(true);
        try {
          await onProgressUpdate(debouncedItems);
        } catch (error) {
          console.error("Failed to save progress:", error);
        } finally {
          setIsProcessing(false);
        }
      };
      saveProgress();
    }
  }, [debouncedItems, onProgressUpdate]);


  const calculateMonthlySurplus = () => {
    if (!plan) return 0;
    
    return (
      plan.userMonthlyIncome + 
      (plan.hasCoApplicant ? (plan.coApplicantMonthlyIncome || 0) : 0) + 
      (plan.monthlyOtherIncome || 0) - 
      plan.monthlyLivingExpenses - 
      (plan.monthlyNonHousingDebt || 0) - 
      (plan.currentAnnualInsurancePremium || 0) / 12
    ) || 0;
  };

  const calculateTimeImpact = (amount: number) => {
    const monthlySurplus = calculateMonthlySurplus();
    
    if (monthlySurplus <= 0) {
      return "Không thể tính toán do thu nhập không đủ";
    }
    
    const dayImpact = Math.round((amount / monthlySurplus) * 30);
    
    if (dayImpact > 0) {
      return `Giảm ${dayImpact} ngày để đạt mục tiêu`;
    } else if (dayImpact < 0) {
      return `Tăng ${Math.abs(dayImpact)} ngày để đạt mục tiêu`;
    } else {
      return "Không ảnh hưởng đến thời gian";
    }
  };

  useEffect(() => {
    setItems(defaultItems);
    rewardedTasksRef.current.clear();
  }, [milestoneId]); // Bỏ `defaultItems` khỏi danh sách dependency


  if (showMilestoneCompleted) {
    return (
      <MilestoneCompleted 
        milestoneId={milestoneId}
        onNext={() => {
          setItems(prev => prev.map(item => ({ ...item, status: "auto-completed" as const })));
          setShowMilestoneCompleted(false);
        }}
      />
    );
  }

  const handleAddExtraTask = async (description: string, amount: number = 0) => {
    
    const newTask = { 
      text: description, 
      type: "user" as const,
      status: "completed" as const,
      amount: amount
    };
    
    try {
      const result = await saveCustomTask(planId, milestoneId, newTask);
      
      if (result.success) {
        setItems(prev => [...prev, {
          ...newTask,
          id: result.task.id,
          isCustom: true,
        }]);
        
        console.log("✅ Task saved to database and added to UI");
        
        if (amount !== 0 && onSavingsUpdate) {
          setTimeout(() => onSavingsUpdate(amount), 0);
        }
      }
    } catch (error) {
      console.error("❌ Error saving task:", error);
      setItems(prev => [...prev, newTask]);
    }
    
    setModalOpen(false);
  };

  const handleToggleTask = (taskIndex: number) => {
    const currentItem = items[taskIndex];
    if (!currentItem) return;

    const newStatus = currentItem.status === 'completed' ? 'incomplete' : 'completed';

    // Cập nhật savings ở client ngay lập tức
    if (onSavingsUpdate && currentItem.amount) {
      const amountToUpdate = newStatus === 'completed' ? currentItem.amount : -currentItem.amount;
      onSavingsUpdate(amountToUpdate);
    }

    // Cập nhật state `items`, việc lưu sẽ được `useEffect` và `useDebounce` xử lý
    setItems(currentItems =>
      currentItems.map((item, index) => {
        if (index === taskIndex) {
          return { ...item, status: newStatus };
        }
        return item;
      })
    );
  };

  // Hàm lấy màu border dựa trên type
  const getBorderColor = (type: TaskType) => {
    switch (type) {
      case "system":
        return "border-orange-500"; // Hệ thống - màu cam
      case "user":
        return "border-green-500"; // Người dùng - màu xanh
      default:
        return "border-orange-500";
    }
  };

  const allItemsCompleted = items.length > 0 && items.every(item => 
    item.status === "completed" || item.status === "auto-completed"
  );
  const isPendingConfirmation = items.some(item => item.status === 'completed');

  const getBackgroundColor = (status: "incomplete" | "completed" | "auto-completed") => {
    switch (status) {
      case "auto-completed":
        return "bg-gray-700";
      case "completed":
        return "bg-gray-800";
      default:
        return "bg-gray-800";
    }
  };

  // Gợi ý: bạn có thể đặt hàm này trong `src/lib/utils.ts`
  function formatCurrency(value: number): string {
    if (Math.abs(value) >= 1000) {
      return `${(value / 1000).toFixed(1).replace('.0', '')} tỷ`;
    }
    return `${value} triệu`;
  }

  return (
    <>
      {/* Section: Việc cần thực hiện */}
      {!allItemsCompleted ? (
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4 text-white">Việc cần thực hiện</h3>
          <div className="space-y-3">
            {items.map((item, index) => {
              if (item.status !== "incomplete") return null;
              
              return (
                <div 
                  key={`item-${index}`} 
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg border-l-4 transition-opacity cursor-pointer ${getBorderColor(item.type)} ${getBackgroundColor("incomplete")} ${isProcessing ? 'opacity-50' : 'opacity-100'}`}
                  onClick={() => handleToggleTask(index)}
                >
                  <div 
                    className={`w-5 h-5 border-2 border-gray-400 rounded-full hover:border-gray-300 transition-colors`}
                  ></div>
                  <span className="text-white flex-1">{item.text}</span>
                  {item.amount && (
                    <span className={`text-sm font-medium ${
                      item.amount < 0 ? 'text-red-400' : 'text-green-400'
                    }`}>
                      {item.amount < 0 ? '' : '+'}
                      {formatCurrency(item.amount)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        // Khi tất cả items đã hoàn thành
        <div className="mb-8">
          <div className="bg-white rounded-lg p-6 text-center">
            {onMilestoneCompleted && isPendingConfirmation ? (
              <button
                onClick={onMilestoneCompleted}
                className="rounded-lg font-semibold transition-colors text-black cursor-pointer text-xl"
              >
                Xác nhận hoàn thành cột mốc
              </button>
            ) : (
              isLastMilestone ? (
                <div className="space-y-4">
                  <div className="text-black text-lg font-medium">
                    🎉 Chúc mừng! Bạn đã hoàn thành tất cả milestones!
                  </div>
                  <div className="text-black text-sm">
                    Bạn đã đi một chặng đường dài và đạt được mục tiêu của mình.
                  </div>
                </div>
              ) : (
                <div className="text-black text-sm">
                  Bạn đã hoàn thành cột mốc này!
                </div>
              )
            )}
          </div>
        </div>
      )}

      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4 text-white">Việc đã hoàn thành</h3>
        <div className="space-y-3">
          {items.map((item, index) => {
            // Chỉ render items có status = "completed" hoặc "auto-completed"
            if (item.status !== "completed" && item.status !== "auto-completed") return null;
            
            return (
              <div key={`item-${index}`} className={`flex items-center gap-3 px-4 py-3 rounded-lg border-l-4 ${getBorderColor(item.type)} ${getBackgroundColor(item.status)}`}>
                <div 
                  className={`w-5 h-5 rounded-full flex items-center justify-center cursor-pointer transition-colors ${
                    item.status === "auto-completed" 
                      ? "bg-gray-600 hover:bg-gray-500" 
                      : "bg-gray-500 hover:bg-gray-400"
                  }`}
                  onClick={() => handleToggleTask(index)}
                >
                  <span className="text-white text-xs">✓</span>
                </div>
                <span className="text-white flex-1">{item.text}</span>
                {item.amount && (
                  <span className={`text-sm font-medium ${
                    item.amount < 0 ? 'text-red-400' : 'text-green-400'
                  }`}>
                    {item.amount < 0 ? '' : '+'}
                    {formatCurrency(item.amount)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating Action Button */}
      <div className="flex justify-end mb-6">
        <button
          className="bg-cyan-500 hover:bg-cyan-600 text-white rounded-full w-14 h-14 text-3xl shadow-lg flex items-center justify-center"
          onClick={() => setModalOpen(true)}
        >
          +
        </button>
      </div>

      <AddCashflowModal 
        open={modalOpen} 
        onClose={() => setModalOpen(false)} 
        onSubmit={handleAddExtraTask} // Đã đúng rồi vì handleAddExtraTask nhận (description, amount)
        monthlySurplus={monthlySurplus} // <-- TRUYỀN VÀO MODAL
      />
    </>
  );
}
