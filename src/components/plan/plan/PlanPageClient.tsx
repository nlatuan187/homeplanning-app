"use client";

import { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Plan } from "@prisma/client";

import MilestoneCompleted from "./MilestoneCompleted";
import MilestoneSteps from "./MilestoneSteps";
import AccumulationProgress from "./AccumulationProgress";
import MilestoneTaskSection from "./MilestioneTaskSection";
import AddCashflowModal from "./AddCashflowModal";

export default function PlanPageClient({ initialPlan }: { initialPlan: Plan }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<number | null>(null);
  const [milestoneData, setMilestoneData] = useState<any>(null);

  useEffect(() => {
    // Đọc data từ localStorage thay vì URL
    const savedData = localStorage.getItem(`milestoneData_${initialPlan.id}`);
    console.log("Saved data from localStorage:", savedData); // Debug log
    
    if (savedData) {
      try {
        const data = JSON.parse(savedData);
        console.log("Parsed milestone data:", data); // Debug log
        setMilestoneData(data);
        
        // Set selectedMilestoneId dựa trên title
        const goalNumber = data.title.match(/Goal (\d+)/)?.[1];
        if (goalNumber) {
          setSelectedMilestoneId(parseInt(goalNumber));
        }
        
        // Xóa data sau khi đã đọc
        localStorage.removeItem(`milestoneData_${initialPlan.id}`);
      } catch (error) {
        console.error("Error parsing milestone data:", error);
      }
    } else {
      console.log("No saved data found for plan:", initialPlan.id); // Debug log
    }
  }, [initialPlan.id]);

  console.log("Current milestoneData state:", milestoneData);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="container mx-auto max-w-5xl px-4 pt-8 pb-4 flex items-center justify-center sticky top-0 bg-slate-950 z-40 border-b border-slate-800 relative">
        <Button variant="ghost" size="icon" className="text-white absolute left-4 top-1/2 -translate-y-1/2">
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <div className="flex flex-col items-center">
          <div className="text-2xl font-bold">
            {milestoneData ? milestoneData.title : "Cột mốc số"}
          </div>
          <div className="text-[14px] text-gray-400">
            {milestoneData ? 
              `Tích lũy đạt ${milestoneData.currentSavings?.toLocaleString() || 0}` : 
              "Tích lũy đạt ..."
            }
          </div>
        </div>
      </header>

      {/* Hiển thị thông tin milestone chỉ khi có data */}
      {milestoneData && (
        <div className="bg-slate-800 p-4 rounded-lg m-4">
          <h3 className="text-lg font-semibold mb-2">{milestoneData.title}</h3>
          <p>Status: {milestoneData.status}</p>
          <p>Progress: {(milestoneData.progress * 100).toFixed(1)}%</p>
          <p>Current Savings: {milestoneData.currentSavings?.toLocaleString()}</p>
          <p>Target Amount: {milestoneData.amountValue?.toLocaleString()}</p>
        </div>
      )}

      {/* Hiển thị thông báo khi không có data */}
      {!milestoneData && (
        <div className="bg-slate-800 p-4 rounded-lg m-4">
          <p className="text-gray-400">Không có dữ liệu milestone được chọn</p>
        </div>
      )}

      {/* Modal tạo thêm nhiệm vụ */}
      <AddCashflowModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={(text) => {
          console.log("Add task:", text);
        }}
      />
    </main>
  );
}
