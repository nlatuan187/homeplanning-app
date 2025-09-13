"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList, LineChart, Line } from 'recharts';
import { ChartMilestone } from "@/lib/calculations/projections/generateChartData";

interface AccumulationChartProps {
  data: ChartMilestone[];
  dataKey: "pctSalaryGrowth" | "pctHouseGrowth" | "pctInvestmentReturn"; // Thêm pctSalaryGrowth, pctHouseGrowth, pctInvestmentReturn
  name: string;
}

const formatNumber = (value: number) => {
  return new Intl.NumberFormat('vi-VN').format(Math.round(value));
};

export default function AccumulationChart({ data, dataKey, name }: AccumulationChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center text-slate-500 py-10">
        Không có dữ liệu để hiển thị biểu đồ.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <AreaChart
        data={data}
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
      >
        <defs>
          <linearGradient id="colorSavings" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="name" stroke="#9ca3af" />
        <YAxis hide={true} domain={['auto', 'dataMax * 1.1']} />
        <Tooltip
          contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
           formatter={(value: number) => new Intl.NumberFormat('vi-VN').format(value)}
        />
        <Legend verticalAlign="bottom" wrapperStyle={{ paddingTop: 20 }}/>
        <Area type="monotone" dataKey={dataKey} name={name} stroke="#22d3ee" fillOpacity={1} fill="url(#colorSavings)" strokeWidth={2}>
           <LabelList dataKey={dataKey} position="top" formatter={formatNumber} fill="#e5e7eb" fontSize={12} />
        </Area>
      </AreaChart>
    </ResponsiveContainer>
  );
}
