// components/MilestoneTaskSection.tsx
"use client";

import React, { useState, useEffect } from "react";
import TodoList from "./TodoList";
import { Lock } from "lucide-react";

interface MilestoneTaskSectionProps {
  currentMilestone: any;
  currentStep: number;
  milestoneId: number;
  planId: string;
  plan: any;
  onSavingsUpdate?: (amount: number) => void;
  onMilestoneCompleted?: () => void;
  // BƯỚC 2.2: SỬA SIGNATURE CỦA PROP
  onProgressUpdate?: (tasks: any[]) => Promise<void>;
  isMilestoneCompleted?: boolean;
  accumulationMax: number;
  accumulationMin: number;
  milestones: any[];
  currentMilestoneInGroup: any;
  onGoToRoadmap?: () => void;
  isLastMilestone?: boolean;
  hasNextMilestone?: boolean;
  monthlySurplus: number; // <-- THÊM PROP NÀY
}

export default function MilestoneTaskSection({ 
  milestoneId, 
  planId,
  plan,
  onProgressUpdate, // Nhận prop mới
  onSavingsUpdate, 
  onMilestoneCompleted, 
  isMilestoneCompleted = false,
  accumulationMax,
  accumulationMin,
  milestones,
  currentMilestoneInGroup,
  onGoToRoadmap,
  isLastMilestone = false,
  hasNextMilestone = false,
  currentMilestone,
  currentStep,
  monthlySurplus, // <-- NHẬN PROP NÀY
}: MilestoneTaskSectionProps) {
  const currentMilestoneStatus = currentMilestoneInGroup?.status || "upcoming";
  
  const allTasks = currentMilestoneInGroup?.items || [];

  const tasksWithStatus = (isMilestoneCompleted || currentMilestoneStatus === "done")
    ? allTasks.map((task: any) => ({ ...task, status: "auto-completed" as const }))
    : allTasks;
  
  const todoListKey = `group-${currentMilestone?.id}-step-${currentStep}`;

  return (
    <div className="">
      {currentMilestoneInGroup?.status === 'upcoming' ? (
        <div className="bg-slate-800/30 border border-dashed border-slate-700 rounded-lg p-8 flex flex-col items-center justify-center text-center min-h-[300px]">
          <Lock className="w-12 h-12 text-slate-500 mb-4" />
          <p className="text-slate-300 font-semibold text-lg">
            Cột mốc này đang được khoá
          </p>
          <p className="text-slate-400 mt-1">
            Hãy hoàn thành các cột mốc trước để mở khoá nhé!
          </p>
        </div>
      ) : (
        <TodoList
          key={todoListKey}
          milestoneId={milestoneId}
          planId={planId}
          defaultItems={tasksWithStatus}
          // BƯỚC 2.3: TRUYỀN PROP MỚI XUỐNG TODOLIST
          onProgressUpdate={onProgressUpdate}
          onSavingsUpdate={onSavingsUpdate}
          onMilestoneCompleted={onMilestoneCompleted}
          isMilestoneCompleted={isMilestoneCompleted || currentMilestoneStatus === "done"}
          plan={plan}
          currentMilestoneAmount={accumulationMax}
          previousMilestoneAmount={accumulationMin}
          onGoToRoadmap={onGoToRoadmap}
          isLastMilestone={isLastMilestone}
          hasNextMilestone={hasNextMilestone}
          monthlySurplus={monthlySurplus} // <-- TRUYỀN XUỐNG TODOLIST
        />
      )}
    </div>
  );
}
