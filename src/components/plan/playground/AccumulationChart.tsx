"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import { ChartMilestone } from "@/lib/calculations/projections/generateChartData";

type Props = {
  data: ChartMilestone[];
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

export default function AccumulationChart({ data }: Props) {
  return (
    <div className="bg-slate-900/70 rounded-xl text-white w-full">
      <h2 className="text-white font-semibold px-6 py-2 text-lg sm:text-base text-left">
        Dòng tiền tích luỹ
      </h2>
      <div className="w-full sm:w-full md:w-[700px] lg:w-[900px] mx-auto h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
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
            <Line
              type="linear"
              dataKey="cumulativeSavingsFromInitial"
              name="Khoản tiết kiệm"
              stroke="#a0e8e0"
              fill="#a0e8e0"
              fillOpacity={0.3}
              strokeWidth={2}
              dot={<SquareDot />}
            />
            <Line
              type="linear"
              dataKey="cumulativeSavingsFromMonthly"
              name="Khoản tích luỹ hàng tháng"
              stroke="#00bcd4"
              fill="#00bcd4"
              fillOpacity={0.3}
              strokeWidth={2}
              dot={<SquareDot />}
            />
            <Line
              type="linear"
              dataKey="cumulativeSavings"
              name="Tổng tích luỹ"
              stroke="#fbc02d"
              fill="#fbc02d"
              fillOpacity={0.3}
              strokeWidth={3}
              dot={<SquareDot />}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
