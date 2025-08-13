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
  onMilestoneCompleted?: () => void; // Có thể giữ lại để sử dụng sau
  isMilestoneCompleted?: boolean;
  plan?: any; // Plan object
  currentMilestoneAmount?: number;
  previousMilestoneAmount?: number;
  planId: string; // Thêm planId để truyền xuống
  // Thêm props mới để xác định milestone kế tiếp
  onNextMilestone?: () => void;
  hasNextMilestone?: boolean;
  // Thêm prop mới để chuyển về roadmap
  onGoToRoadmap?: () => void;
  // Thêm prop mới để xác định milestone cuối cùng
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
  onNextMilestone,
  hasNextMilestone = false,
  isLastMilestone = false // Thêm prop mới
}: TodoListProps) {
  const [items, setItems] = useState(defaultItems);
  const [modalOpen, setModalOpen] = useState(false);
  const [showMilestoneCompleted, setShowMilestoneCompleted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const rewardedTasksRef = useRef<Set<string>>(new Set());

  // Thêm useEffect để reset rewardedTasksRef khi milestoneId thay đổi
  useEffect(() => {
    // Reset rewardedTasksRef khi chuyển milestone
    rewardedTasksRef.current.clear();
    console.log("🔄 Reset rewardedTasksRef for milestone:", milestoneId);
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

  // Tính toán impact của dòng tiền mới lên thời gian
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
    console.log("🔄 TodoList: defaultItems changed for milestoneId:", milestoneId);
    console.log("🔄 TodoList: defaultItems length:", defaultItems.length);
    console.log("🔄 TodoList: defaultItems:", defaultItems);
    
    // QUAN TRỌNG: Luôn cập nhật items khi milestoneId thay đổi
    setItems(defaultItems);
    
    // Reset rewardedTasksRef khi milestoneId thay đổi
    rewardedTasksRef.current.clear();
    console.log("🔄 TodoList: Reset rewardedTasksRef for milestone:", milestoneId);
  }, [defaultItems, milestoneId]);

  // Sửa logic tự động chuyển sang MilestoneCompleted - chỉ với milestone cuối cùng
  useEffect(() => {
    const allCompleted = items.length > 0 && items.every(item => 
      item.status === "completed" || item.status === "auto-completed"
    );
    
    const hasManualCompleted = items.some(item => item.status === "completed");
    
    // Chỉ tự động chuyển nếu là milestone cuối cùng
    if (allCompleted && hasManualCompleted && onMilestoneCompleted && !showMilestoneCompleted && isLastMilestone) {
      onMilestoneCompleted();
    }
  }, [items, onMilestoneCompleted, showMilestoneCompleted, isLastMilestone]);

  // Thêm lại logic hiển thị MilestoneCompleted
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
        // Thêm vào local state với ID từ database
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
    if (isProcessing) {
      return;
    }
    
    setIsProcessing(true); // Disable clicks tạm thời
    
    try {
      setItems(prev => {
        const newItems = [...prev];
        const item = newItems[taskIndex];
        // Sửa: Thêm milestoneId vào taskKey để tránh duplicate giữa các milestones
        const taskKey = `${milestoneId}-${item.text}-${item.type}`;
        
        if (isCompleted) {
          // Khi bỏ chọn task (chuyển về incomplete)
          newItems[taskIndex] = { ...item, status: "incomplete" };
          
          // Sửa: Khi bỏ chọn task, cũng cần cập nhật currentSavings
          if (item.amount !== undefined && onSavingsUpdate) {
            // Trừ đi amount khi bỏ chọn task
            setTimeout(() => {
              onSavingsUpdate(-(item.amount || 0));
            }, 0);
          }
          
        } else {
          // Khi chọn task (hoàn thành)
          newItems[taskIndex] = { ...item, status: "completed" };
          
          if (item.amount !== undefined && !rewardedTasksRef.current.has(taskKey) && onSavingsUpdate) {
            rewardedTasksRef.current.add(taskKey);
            setTimeout(() => {
              onSavingsUpdate(item.amount as number);
            }, 0);
          }
        }
        
        return newItems;
      });
    } finally {
      setTimeout(() => {
        setIsProcessing(false);
      }, 300);
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

  const getBackgroundColor = (status: "incomplete" | "completed" | "auto-completed") => {
    switch (status) {
      case "auto-completed":
        return "bg-gray-700"; // Màu xám đậm hơn cho auto-completed
      case "completed":
        return "bg-gray-800"; // Màu xám bình thường cho completed
      default:
        return "bg-gray-800";
    }
  };

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
                <div key={`item-${index}`} className={`flex items-center gap-3 px-4 py-3 rounded-lg border-l-4 ${getBorderColor(item.type)} ${getBackgroundColor("incomplete")}`}>
                  <div 
                    className={`w-5 h-5 border-2 border-gray-400 rounded-full cursor-pointer hover:border-gray-300 transition-colors ${
                      isProcessing ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    onClick={() => {
                      handleToggleTask(index, false);
                    }}
                  ></div>
                  <span className="text-white flex-1">{item.text}</span>
                  {item.amount && (
                    <span className={`text-sm font-medium ${
                      item.amount < 0 ? 'text-red-400' : 'text-green-400'
                    }`}>
                      {item.amount < 0 ? '' : '+'}
                      {item.amount.toLocaleString()} triệu
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
            {isLastMilestone ? (
              // Nếu là milestone cuối cùng của group cuối cùng, hiển thị thông báo hoàn thành
              <div className="space-y-4">
                <div className="text-black text-lg font-medium">
                  🎉 Chúc mừng! Bạn đã hoàn thành tất cả milestones!
                </div>
                <div className="text-black text-sm">
                  Hãy chờ một chút để chuyển đến trang hoàn thành...
                </div>
              </div>
            ) : hasNextMilestone && onNextMilestone ? (
              // Nếu có milestone con kế tiếp hoặc group kế tiếp, hiển thị button chuyển tiếp
              <button
                onClick={onNextMilestone}
                className="rounded-lg font-semibold transition-colors text-black cursor-pointer text-xl"
              >
                Chuyển sang mục tiêu tiếp theo
              </button>
            ) : (
              // Fallback
              <div className="text-black text-sm">
                Bạn đã hoàn thành milestone này!
              </div>
            )}
          </div>
        </div>
      )}

      {/* Section: Việc đã hoàn thành */}
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
                    {item.amount.toLocaleString()} triệu
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
