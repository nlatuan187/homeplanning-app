// components/TodoItem.tsx
import React from "react";

export type TaskType = "system" | "user"; // Hệ thống tự động giao vs người dùng tự thêm

export default function TodoItem({ text, type }: { text: string; type: TaskType }) {
  const labelColor = {
    system: "bg-orange-500", // Màu cam cho hệ thống
    user: "bg-green-500",    // Màu xanh cho người dùng
  };

  return (
    <div className="flex items-center gap-3 bg-slate-800 px-4 py-2 rounded-xl shadow">
      <span className={`w-3 h-3 rounded-full ${labelColor[type]}`} />
      <span className="text-white">{text}</span>
    </div>
  );
}
