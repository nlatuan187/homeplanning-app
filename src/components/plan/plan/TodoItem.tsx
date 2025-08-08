// components/TodoItem.tsx
import React from "react";

export type TaskType = "must_do" | "should_do" | "extra";

export default function TodoItem({ text, type }: { text: string; type: TaskType }) {
  const labelColor = {
    must_do: "bg-red-500",
    should_do: "bg-yellow-500",
    extra: "bg-gray-500",
  };

  return (
    <div className="flex items-center gap-3 bg-slate-800 px-4 py-2 rounded-xl shadow">
      <span className={`w-3 h-3 rounded-full ${labelColor[type]}`} />
      <span className="text-white">{text}</span>
    </div>
  );
}
