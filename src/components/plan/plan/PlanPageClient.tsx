"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Plan } from "@prisma/client";

import MilestoneCompleted from "./MilestoneCompleted";
import MilestoneSteps from "./MilestoneSteps";
import AccumulationProgress from "./AccumulationProgress";
import MilestoneTaskSection from "./MilestioneTaskSection";
import AddCashflowModal from "./AddCashflowModal";

interface PlanPageClientProps {
  initialPlan: Plan;
  confirmedMilestoneId: number
}

export default function PlanPageClient({ initialPlan, confirmedMilestoneId }: PlanPageClientProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<number | null>(null);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="container mx-auto max-w-5xl px-4 pt-8 pb-4 flex items-center gap-4 sticky top-0 bg-slate-950 z-40 border-b border-slate-800">
        <Button variant="ghost" size="icon" className="text-white">
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-xl font-semibold">Kế hoạch tài chính</h1>
      </header>

      {/* Nội dung chính */}
      <div className="container mx-auto max-w-5xl px-4 pt-6 pb-24 space-y-6">
        {/* Tiến độ tổng thể */}
        <AccumulationProgress plan={initialPlan} />

        {/* Các bước hoàn thành milestone */}
        <MilestoneSteps
          confirmedMilestoneId={initialPlan.confirmedMilestoneId}
          onMilestoneSelect={(id) => setSelectedMilestoneId(id)}
        />

        {/* Cột mốc đã hoàn thành */}
        <MilestoneCompleted plan={initialPlan} />

        {/* Todo list cho từng milestone */}
        {selectedMilestoneId !== null && (
          <MilestoneTaskSection milestoneId={selectedMilestoneId} />
        )}
      </div>

      {/* Modal tạo thêm nhiệm vụ */}
      <AddCashflowModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={(text) => {
          // Có thể xử lý thêm logic thêm task vào milestone cụ thể nếu cần
          console.log("Add task:", text);
        }}
      />
    </main>
  );
}
