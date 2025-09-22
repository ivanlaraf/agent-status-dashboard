import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useMemo } from "react";

interface APIAgentState {
  StartTime: string;
  AgentId: string;
  EndTime: string;
  Status: string;
  Duration: number;
  AgentName: string;
}

interface DailyTrendsChartProps {
  data: APIAgentState[];
}

const DailyTrendsChart = ({ data }: DailyTrendsChartProps) => {
  const hourlyData = useMemo(() => {
    // Initialize hours 0-23
    const hours = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      Available: 0,
      Busy: 0,
      Offline: 0,
      Disconnect: 0,
    }));

    // Count agents active in each hour by status
    data.forEach((item) => {
      const startHour = new Date(`1970-01-01T${item.StartTime}`).getHours();
      const endHour = new Date(`1970-01-01T${item.EndTime}`).getHours();
      
      // For each hour this agent was in this status
      for (let hour = startHour; hour <= endHour; hour++) {
        if (hour >= 0 && hour < 24) {
          const status = item.Status === "Disconnected" ? "Disconnect" : item.Status;
          if (status in hours[hour]) {
            (hours[hour] as any)[status] += 1;
          }
        }
      }
    });

    return hours.map(hourData => ({
      ...hourData,
      time: `${hourData.hour.toString().padStart(2, '0')}:00`
    }));
  }, [data]);

  const formatHour = (hour: number) => {
    const date = new Date();
    date.setHours(hour, 0, 0, 0);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      hour12: true 
    });
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const hour = parseInt(label.split(':')[0]);
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-md">
          <p className="font-semibold">{formatHour(hour)}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.dataKey}: {entry.value} agents
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Daily Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            No data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Trends</CardTitle>
        <p className="text-sm text-muted-foreground">
          Agent activity throughout the day
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={hourlyData}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey="time" 
              tick={{ fontSize: 12 }}
              interval="preserveStartEnd"
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              label={{ value: 'Active Agents', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="Available" 
              stroke="#10b981" 
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line 
              type="monotone" 
              dataKey="Busy" 
              stroke="#ef4444" 
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line 
              type="monotone" 
              dataKey="Offline" 
              stroke="#6b7280" 
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line 
              type="monotone" 
              dataKey="Disconnect" 
              stroke="#f97316" 
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default DailyTrendsChart;