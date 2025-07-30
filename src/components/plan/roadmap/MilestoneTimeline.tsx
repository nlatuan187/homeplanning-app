import React from "react";
import Image from "next/image";

interface Milestone {
  id: number;
  title: string;
  amount: string;
  status: "done" | "current" | "upcoming";
  icon?: string;
}

export default function MilestoneTimeline({ milestones }: { milestones: Milestone[] }) {
  // Tăng spacingHeight để kéo giãn khoảng cách mỗi cột mốc
  const spacingHeight = 150; // trước đây 100

  return (
    <div className="relative w-full mt-10">
      {/* Đường nối chung bằng SVG */}
      <svg
        className="absolute left-0 top-0 w-full h-full z-0"
        viewBox={`0 0 100 ${milestones.length * spacingHeight}`}
        preserveAspectRatio="none"
      >
        {milestones.map((m, idx) => {
          if (idx === milestones.length - 1) return null;

          const isEven = (idx + 1) % 2 === 0;
          const x1 = isEven ? 80 : 20;
          const x2 = isEven ? 20 : 80;
          const y1 = idx * spacingHeight + 40;
          const y2 = (idx + 1) * spacingHeight + 40;

          return (
            <path
              key={idx}
              d={`M${x1},${y1} C${x1},${y1 + 50} ${x2},${y2 - 50} ${x2},${y2}`}
              stroke="#06b6d4"
              strokeWidth="2"
              fill="none"
            />
          );
        })}
      </svg>

      {milestones.map((m, idx) => {
        const isEven = (idx + 1) % 2 === 0;
        return (
          <div
            key={m.id}
            className={`relative flex items-center mb-24 z-10`}
            style={{ height: `${spacingHeight}px` }}
          >
            {/* Trái */}
            <div className={`w-1/2 flex ${!isEven ? "justify-center" : ""}`}>
              {!isEven && (
                <div className="flex flex-col items-center">
                  <div
                    className={`w-20 h-20 rounded-full border-4 flex items-center justify-center
                      ${
                        m.status === "done"
                          ? "border-cyan-500 bg-cyan-800"
                          : m.status === "current"
                          ? "border-cyan-500 bg-neutral-900"
                          : "border-gray-600 bg-neutral-900"
                      }`}
                  >
                    {m.status === "done" ? (
                      <span className="text-3xl">✔</span>
                    ) : (
                      <Image
                        src={m.icon || "/default-icon.png"}
                        alt={m.title}
                        width={32}
                        height={32}
                      />
                    )}
                  </div>
                  <div className="text-center mt-3">
                    <div className="font-semibold">{m.title}</div>
                    <div className="text-slate-300 text-sm">{m.amount}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Phải */}
            <div className={`w-1/2 flex ${isEven ? "justify-center" : ""}`}>
              {isEven && (
                <div className="flex flex-col items-center">
                  <div
                    className={`w-20 h-20 rounded-full border-4 flex items-center justify-center
                      ${
                        m.status === "done"
                          ? "border-cyan-500 bg-cyan-800"
                          : m.status === "current"
                          ? "border-cyan-500 bg-neutral-900"
                          : "border-gray-600 bg-neutral-900"
                      }`}
                  >
                    {m.status === "done" ? (
                      <span className="text-3xl">✔</span>
                    ) : (
                      <Image
                        src={m.icon || "/default-icon.png"}
                        alt={m.title}
                        width={32}
                        height={32}
                      />
                    )}
                  </div>
                  <div className="text-center mt-3">
                    <div className="font-semibold">{m.title}</div>
                    <div className="text-slate-300 text-sm">{m.amount}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
