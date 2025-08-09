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
  // Thêm props để tính toán estimate time
  plan?: any; // Plan object
  currentMilestoneAmount?: number;
  previousMilestoneAmount?: number;
  planId: string; // Thêm planId để truyền xuống
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
  planId
}: TodoListProps) {
  const [items, setItems] = useState(defaultItems);
  const [modalOpen, setModalOpen] = useState(false);
  const [showMilestoneCompleted, setShowMilestoneCompleted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [timeImpactMessage, setTimeImpactMessage] = useState<string | null>(null);
  
  // Theo dõi các task đã được reward
  const rewardedTasksRef = useRef<Set<string>>(new Set());

  // Tính toán monthly surplus
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
    
    // Công thức: (dòng tiền mới) / monthlySurplus * 30
    const dayImpact = Math.round((amount / monthlySurplus) * 30);
    
    if (dayImpact > 0) {
      return `Giảm ${dayImpact} ngày để đạt mục tiêu`;
    } else if (dayImpact < 0) {
      return `Tăng ${Math.abs(dayImpact)} ngày để đạt mục tiêu`;
    } else {
      return "Không ảnh hưởng đến thời gian";
    }
  };

  // Cập nhật items khi defaultItems thay đổi
  useEffect(() => {
    setItems(defaultItems);
  }, [defaultItems]);

  useEffect(() => {
    const allCompleted = items.length > 0 && items.every(item => 
      item.status === "completed" || item.status === "auto-completed"
    );
    console.log("All items completed check:", allCompleted);
    
    // Chỉ trigger MilestoneCompleted khi có ít nhất 1 item được completed thủ công
    const hasManualCompleted = items.some(item => item.status === "completed");
    
    if (allCompleted && hasManualCompleted && onMilestoneCompleted && !showMilestoneCompleted) {
      console.log("Setting showMilestoneCompleted to true (manual completion)");
      setShowMilestoneCompleted(true);
      onMilestoneCompleted();
    }
  }, [items, onMilestoneCompleted, showMilestoneCompleted]);

  const handleAddExtraTask = async (description: string, amount: number = 0) => {
    console.log("🆕 Adding new task:", { description, amount });
    
    // Tạo task object
    const newTask = { 
      text: description, 
      type: "user" as const,
      status: "completed" as const,
      amount: amount
    };
    
    try {
      // Lưu vào database trước
      const result = await saveCustomTask(planId, milestoneId, newTask);
      
      if (result.success) {
        // Thêm vào local state với ID từ database
        setItems(prev => [...prev, {
          ...newTask,
          id: result.task.id,
          isCustom: true,
        }]);
        
        console.log("✅ Task saved to database and added to UI");
        
        // Tính toán và hiển thị impact lên thời gian
        if (amount !== 0) {
          const impact = calculateTimeImpact(amount);
          setTimeImpactMessage(impact);
          console.log("⏱️ Time impact:", impact);
          
          // Ẩn message sau 5 giây
          setTimeout(() => {
            setTimeImpactMessage(null);
          }, 5000);
        }
        
        // Cập nhật savings
        if (amount !== 0 && onSavingsUpdate) {
          setTimeout(() => onSavingsUpdate(amount), 0);
        }
      }
    } catch (error) {
      console.error("❌ Error saving task:", error);
      // Fallback: chỉ thêm vào local state
      setItems(prev => [...prev, newTask]);
    }
    
    setModalOpen(false);
  };

  const handleToggleTask = async (taskIndex: number, isCompleted: boolean) => {
    // Tránh double-click
    if (isProcessing) {
      console.log("⚠️ Still processing, ignoring click");
      return;
    }

    console.log("🔄 handleToggleTask called:", { taskIndex, isCompleted });
    console.log("🔄 Item being toggled:", items[taskIndex]);
    
    setIsProcessing(true); // Disable clicks tạm thời
    
    try {
      setItems(prev => {
        const newItems = [...prev];
        const item = newItems[taskIndex];
        const taskKey = `${item.text}-${item.type}`;
        
        if (isCompleted) {
          newItems[taskIndex] = { ...item, status: "incomplete" };
          console.log("✅ Task moved to incomplete:", item.text.substring(0, 30) + "...");
        } else {
          newItems[taskIndex] = { ...item, status: "completed" };
          console.log("✅ Task moved to completed:", item.text.substring(0, 30) + "...");
          
          if (item.amount !== undefined && !rewardedTasksRef.current.has(taskKey) && onSavingsUpdate) {
            rewardedTasksRef.current.add(taskKey);
            console.log("💰 About to reward task:", item.text.substring(0, 30) + "...", "Amount:", item.amount);
            setTimeout(() => {
              console.log("💰 Actually calling onSavingsUpdate with:", item.amount);
              onSavingsUpdate(item.amount as number);
            }, 0);
          } else if (item.amount !== undefined && rewardedTasksRef.current.has(taskKey)) {
            console.log("⚠️ Task already rewarded:", item.text.substring(0, 30) + "...");
          }
        }
        
        console.log("🔄 New items state:", newItems.map(i => ({ text: i.text.substring(0, 20), status: i.status, amount: i.amount })));
        return newItems;
      });
    } finally {
      // Re-enable clicks sau 300ms
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

  if (showMilestoneCompleted) {
    return (
      <MilestoneCompleted 
        milestoneId={milestoneId}
        onNext={() => {
          // Chuyển tất cả items sang trạng thái auto-completed
          setItems(prev => prev.map(item => ({ ...item, status: "auto-completed" as const })));
          setShowMilestoneCompleted(false);
          
        }}
      />
    );
  }

  return (
    <>
      {/* Time Impact Message */}
      {timeImpactMessage && (
        <div className="mb-4 p-3 bg-blue-900/50 border border-blue-500 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-blue-400 text-sm">⏱️</span>
            <span className="text-blue-300 text-sm font-medium">{timeImpactMessage}</span>
          </div>
        </div>
      )}

      {/* Section: Việc cần thực hiện */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4 text-white">Việc cần thực hiện</h3>
        <div className="space-y-3">
          {items.map((item, index) => {
            // Chỉ render items có status = "incomplete"
            if (item.status !== "incomplete") return null;
            
            return (
              <div key={`item-${index}`} className={`flex items-center gap-3 px-4 py-3 rounded-lg border-l-4 ${getBorderColor(item.type)} ${getBackgroundColor(item.status)}`}>
                <div 
                  className={`w-5 h-5 border-2 border-gray-400 rounded-full cursor-pointer hover:border-gray-300 transition-colors ${
                    isProcessing ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  onClick={() => {
                    console.log("🔄 Clicking incomplete item:", item.text.substring(0, 30), "index:", index);
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
                    console.log("🔄 Clicking completed item:", item.text.substring(0, 30), "index:", index);
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
      <div className="fixed bottom-6 right-6 z-50">
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
