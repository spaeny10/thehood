import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatTime } from '../utils/formatters';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-dark-card border border-dark-border rounded-xl p-3 shadow-xl">
        <p className="text-xs text-slate-500 mb-2">{formatTime(label)}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm font-medium" style={{ color: entry.color }}>
            {entry.name}: {entry.value?.toFixed(1)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const WeatherChart = ({ data, dataKeys, title, yAxisLabel }) => {
  if (!data || data.length === 0) {
    return (
      <div className="card">
        <h3 className="text-sm font-bold text-white mb-4">{title}</h3>
        <p className="text-slate-400 text-sm">No data available</p>
      </div>
    );
  }

  const sortedData = [...data].reverse().map(d => ({ ...d, timestamp: Number(d.timestamp) }));

  return (
    <div className="card card-hover">
      <h3 className="text-sm font-bold text-white mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={sortedData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" vertical={false} />
          <XAxis
            dataKey="timestamp"
            tickFormatter={formatTime}
            stroke="#333"
            tick={{ fill: '#555', fontSize: 11 }}
            axisLine={{ stroke: '#1a1a2e' }}
          />
          <YAxis
            stroke="#333"
            tick={{ fill: '#555', fontSize: 11 }}
            axisLine={{ stroke: '#1a1a2e' }}
            label={{ value: yAxisLabel, angle: -90, position: 'insideLeft', fill: '#555', fontSize: 11 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: '11px', color: '#888', paddingTop: '8px' }}
          />
          {dataKeys.map((key) => (
            <Line
              key={key.key}
              type="monotone"
              dataKey={key.key}
              name={key.name}
              stroke={key.color}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default WeatherChart;
