"use client";

import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList, Area } from 'recharts';
import { ChartMilestone } from "@/lib/calculations/projections/generateChartData";

interface AccumulationChartProps {
  data: ChartMilestone[];
  name: string;
  name2?: string;
  name3?: string;
}

const formatNumber = (value: number) => {
  if (value === null || value === undefined) return "";
  // Sử dụng 'en-US' để có dấu chấm thập phân như trong hình ảnh thiết kế
  const options = {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  };
  return new Intl.NumberFormat('en-US', options).format(value);
};

export default function AccumulationChart({ data, name, name2, name3 }: AccumulationChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center text-slate-500 py-10">
        Không có dữ liệu để hiển thị biểu đồ.
      </div>
    );
  }

  const hasComparisonData = data.some(d => d.value2 !== undefined);

  const processedData = data.map(item => ({
    ...item,
    value3: (item.value || 0) + (item.value2 || 0),
  }));

  return (
    <ResponsiveContainer width="100%" height={250}>
      <ComposedChart
        data={processedData}
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
      >
        <defs>
          <linearGradient id="colorSavings" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
          </linearGradient>
          <linearGradient id="colorComparison" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#facc15" stopOpacity={0.7}/>
            <stop offset="95%" stopColor="#facc15" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="name" stroke="#9ca3af" />
        <YAxis hide={true} domain={['auto', 'dataMax * 1.2']} />
        <Tooltip
          contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
           formatter={(value: number, name: string) => [formatNumber(value), name]}
        />
        <Legend verticalAlign="bottom" wrapperStyle={{ paddingTop: 20 }}/>
        {hasComparisonData ? (
          <>
            <Bar dataKey="value" name={name} fill="#06909A" stackId="a" maxBarSize={80}>
              <LabelList dataKey="value" position="insideTop" formatter={formatNumber} fill="#000" fontSize={12} />
            </Bar>
            <Bar dataKey="value2" name={name2 || 'Đi vay'} fill="#D2A23D" stackId="a" maxBarSize={80}>
              <LabelList dataKey="value2" position="insideTop" formatter={formatNumber} fill="#000" fontSize={12} />
            </Bar>
            <Line type="monotone" dataKey="value3" name={name3 || 'Giá nhà'} stroke="#CDCDCE" strokeWidth={2}>
              <LabelList dataKey="value3" position="top" formatter={formatNumber} fill="#CDCDCE" fontSize={12} />
            </Line>
          </>
        ) : (
          <Area type="monotone" dataKey="value" name={name} stroke="#22d3ee" fillOpacity={0.7} fill="url(#colorSavings)" strokeWidth={2}>
            <LabelList dataKey="value" position="top" formatter={formatNumber} fill="#e5e7eb" fontSize={12} />
          </Area>
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
