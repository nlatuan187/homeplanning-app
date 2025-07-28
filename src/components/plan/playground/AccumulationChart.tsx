"use client";

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";

type Props = {
  data: {
    name: string;
    tietKiem: number;
    hangThang: number;
    tong: number;
  }[];
};

const SquareDot = ({ cx, cy, fill }: any) => {
  return (
    <rect
      x={cx - 4}
      y={cy - 4}
      width={8}
      height={8}
      fill={fill}
      stroke="white"
      strokeWidth={1}
      rx={0}
    />
  );
};

type Milestone = {
  name: string;
  tietKiem: number;
  hangThang: number;
  tong: number;
};

export function generateAccumulationMilestones(
  startOfYearSavings: number,
  monthlyContribution: number,
  annualRate: number,
  years: number,
  startYear: number
): Milestone[] {
  const data: Milestone[] = [];
  let currentSavings = startOfYearSavings;
  const monthlyRate = Math.pow(1 + annualRate, 1 / 12) - 1;

  for (let t = 0; t <= years; t++) {
    // Tại đầu năm t
    const base_savings_growth = currentSavings * Math.pow(1 + monthlyRate, 12);
    const new_savings_growth =
      monthlyContribution * ((Math.pow(1 + monthlyRate, 12) - 1) / monthlyRate);
    const total_savings = base_savings_growth + new_savings_growth;

    data.push({
      name: `${startYear + t}`,
      tietKiem: Math.round(base_savings_growth),
      hangThang: Math.round(new_savings_growth),
      tong: Math.round(total_savings),
    });

    // Chuẩn bị cho năm tiếp theo
    currentSavings = total_savings;
  }
  return data;
}

export default function AccumulationChart({ data }: Props) {
  return (
    <div className="bg-slate-900/70 rounded-xl text-white w-full">
      <h2 className="text-white font-semibold px-2 py-2 text-lg sm:text-base text-left">
        Dòng tiền tích luỹ
      </h2>
      <div className="w-full sm:w-full md:w-[700px] lg:w-[900px] mx-auto h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#444" strokeDasharray="3 3" />
            <XAxis dataKey="name" stroke="#ccc" padding={{ left: 25 }} />
            <YAxis stroke="#ccc" />
            <Tooltip />
            <Legend
              layout="horizontal"
              verticalAlign="top"
              align="center"
              iconType="square"
              iconSize={10}
              wrapperStyle={{ gap: "1.5rem", fontSize: "9px", paddingBottom: 14, display: "flex", justifyContent: "center", width: "100%" }}
            />
            <Area
              type="linear"
              dataKey="tietKiem"
              name="Khoản tiết kiệm"
              stroke="#a0e8e0"
              fill="#a0e8e0"
              fillOpacity={0.3}
              strokeWidth={2}
              dot={<SquareDot />}
            />
            <Area
              type="linear"
              dataKey="hangThang"
              name="Khoản tích luỹ hàng tháng"
              stroke="#00bcd4"
              fill="#00bcd4"
              fillOpacity={0.3}
              strokeWidth={2}
              dot={<SquareDot />}
            />
            <Area
              type="linear"
              dataKey="tong"
              name="Tổng tích luỹ"
              stroke="#fbc02d"
              fill="#fbc02d"
              fillOpacity={0.3}
              strokeWidth={3}
              dot={<SquareDot />}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
