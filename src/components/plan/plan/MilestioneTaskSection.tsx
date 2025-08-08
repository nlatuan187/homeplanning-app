// components/MilestoneTaskSection.tsx
"use client";

import React from "react";
import TodoList from "./TodoList";
import { TaskType } from "./TodoItem";

interface MilestoneTaskSectionProps {
  milestoneId: number;
}

const defaultTasksByMilestone: Record<number, { text: string; type: TaskType }[]> = {
  1: [
    { text: "Gửi tiết kiệm tháng đầu", type: "must_do" },
    { text: "Theo dõi chi tiêu", type: "should_do" },
  ],
  2: [
    { text: "Tăng khoản tiết kiệm hàng tháng", type: "must_do" },
    { text: "Tìm hiểu về đầu tư", type: "should_do" },
  ],
  // Thêm các milestone khác tùy ý
};

export default function MilestoneTaskSection({ milestoneId }: MilestoneTaskSectionProps) {
  const tasks = defaultTasksByMilestone[milestoneId] || [];

  return (
    <div className="p-4">
      <h2 className="text-white text-xl font-bold mb-4">Cột mốc {milestoneId}</h2>
      <TodoList milestoneId={milestoneId} defaultItems={tasks} />
    </div>
  );
}
