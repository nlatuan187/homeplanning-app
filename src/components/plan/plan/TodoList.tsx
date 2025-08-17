// components/TodoList.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import TodoItem, { TaskType } from "./TodoItem";
import AddCashflowModal from "./AddCashflowModal";
import MilestoneCompleted from "./MilestoneCompleted";
import { saveCustomTask } from "@/actions/milestoneProgress";

export interface TodoListProps {
  milestoneId: number;
  defaultItems: { text: string; type: TaskType; status: "incomplete" | "completed" | "auto-completed"; amount?: number }[];
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
}

export default function TodoList({ 
  milestoneId, 
  defaultItems, 
  onSavingsUpdate, 
  onMilestoneCompleted,
  isMilestoneCompleted = false,
  plan,
  currentMilestoneAmount,
  previousMilestoneAmount,
  planId,
  hasNextMilestone = false,
  isLastMilestone = false // Thêm prop mới
}: TodoListProps) {
  const [items, setItems] = useState(defaultItems);
  const [modalOpen, setModalOpen] = useState(false);
  const [showMilestoneCompleted, setShowMilestoneCompleted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const rewardedTasksRef = useRef<Set<string>>(new Set());

  // SỬA LỖI NỀN TẢNG: Chỉ reset lại toàn bộ state khi người dùng chuyển sang milestone LỚN khác.
  // Bỏ `defaultItems` khỏi dependency để ngăn việc re-render của component cha 
  // ghi đè lên trạng thái do người dùng vừa tương tác.
  useEffect(() => {
    setItems(defaultItems);
    rewardedTasksRef.current.clear();
  }, [milestoneId]);

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
    // Chỉ cập nhật lại state items khi milestoneId thay đổi.
    // Việc này ngăn không cho prop `defaultItems` từ component cha
    // ghi đè lên trạng thái mà người dùng vừa tương tác.
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

  const handleToggleTask = async (taskIndex: number, isCompleted: boolean) => {
    // 1. Ngăn chặn click liên tục
    if (isProcessing) return;
    setIsProcessing(true);

    const item = items[taskIndex];
    const amountToUpdate = isCompleted ? -(item.amount || 0) : (item.amount || 0);

    try {
      // 2. Gọi và chờ server xác nhận
      if (onSavingsUpdate && item.amount !== undefined) {
        await onSavingsUpdate(amountToUpdate);
      }

      // 3. Nếu thành công, cập nhật UI một cách chính thức
      setItems(prev => {
        const newItems = [...prev];
        const taskKey = `${milestoneId}-${item.text}-${item.type}`;
        
        if (isCompleted) {
          newItems[taskIndex] = { ...item, status: "incomplete" };
        } else {
          newItems[taskIndex] = { ...item, status: "completed" };
          if (item.amount !== undefined) {
            rewardedTasksRef.current.add(taskKey);
          }
        }
        return newItems;
      });

    } catch (error) {
      // 4. Nếu có lỗi, thông báo cho người dùng
      console.error("Failed to update task:", error);
      // **Gợi ý:** Ở đây bạn có thể dùng một thư viện thông báo (toast)
      // để hiện lỗi cho người dùng, ví dụ: alert("Cập nhật thất bại, vui lòng thử lại.");
    } finally {
      // 5. Cho phép người dùng tương tác lại
      setIsProcessing(false);
    }
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
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg border-l-4 transition-opacity ${getBorderColor(item.type)} ${getBackgroundColor("incomplete")} ${isProcessing ? 'opacity-50' : 'opacity-100'}`}
                >
                  <div 
                    className={`w-5 h-5 border-2 border-gray-400 rounded-full cursor-pointer hover:border-gray-300 transition-colors ${
                      isProcessing ? 'cursor-not-allowed' : ''
                    }`}
                    onClick={() => {
                      if (!isProcessing) handleToggleTask(index, false);
                    }}
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
                  onClick={() => {
                    console.log("🔄 Clicking completed item:", item.status);
                    handleToggleTask(index, true);
                  }}
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
      />
    </>
  );
}
