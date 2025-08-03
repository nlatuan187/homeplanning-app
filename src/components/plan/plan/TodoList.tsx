// components/TodoList.tsx
"use client";

import React, { useState } from "react";
import TodoItem, { TaskType } from "./TodoItem";
import AddCashflowModal from "./AddCashflowModal";

export interface TodoListProps {
  milestoneId: number;
  defaultItems: { text: string; type: TaskType }[];
}

export default function TodoList({ milestoneId, defaultItems }: TodoListProps) {
  const [items, setItems] = useState(defaultItems);
  const [filterType, setFilterType] = useState<"all" | TaskType>("all");
  const [modalOpen, setModalOpen] = useState(false);

  const handleAddExtraTask = (description: string) => {
    setItems(prev => [...prev, { text: description, type: "extra" }]);
    setModalOpen(false);
  };

  return (
    <>
      <div className="flex gap-2 mb-3">
        {[{ label: "Tất cả", value: "all" }, { label: "Cần làm", value: "must_do" }, { label: "Nên làm", value: "should_do" }, { label: "Phát sinh", value: "extra" }].map((item) => (
          <button
            key={item.value}
            onClick={() => setFilterType(item.value as any)}
            className={`px-3 py-1 rounded-full border text-sm ${filterType === item.value ? "bg-white text-black font-semibold" : "border-white text-white"}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {items
          .filter((item) => filterType === "all" || item.type === filterType)
          .map((item, idx) => (
            <TodoItem key={idx} text={item.text} type={item.type} />
          ))}
      </div>

      <div className="fixed bottom-6 inset-x-0 z-50">
        <div className="container mx-auto max-w-5xl px-4 text-right">
          <button
            className="bg-cyan-500 hover:bg-cyan-600 text-white rounded-full w-14 h-14 text-3xl shadow-lg"
            onClick={() => setModalOpen(true)}
          >
            +
          </button>
        </div>
      </div>

      <AddCashflowModal open={modalOpen} onClose={() => setModalOpen(false)} onSubmit={handleAddExtraTask} />
    </>
  );
}
