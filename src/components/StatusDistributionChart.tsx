import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface AgentSummary {
  stateCounts: Record<string, number>;
  stateDurations: Record<string, number>;
}

interface StatusDistributionChartProps {
  summary?: Record<string, AgentSummary>;
  onStatusClick: (status: string) => void;
  selectedStatus: string;
}

const STATUS_COLORS = {
  Available: "hsl(var(--status-available))",
  Busy: "hsl(var(--status-busy))",
  Offline: "hsl(var(--status-offline))", 
  Disconnect: "hsl(var(--status-disconnect))",
  Disconnected: "hsl(var(--status-disconnect))", // alternative name
};

const StatusDistributionChart = ({ summary, onStatusClick, selectedStatus }: StatusDistributionChartProps) => {
  if (!summary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Status Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            No data available
          </div>
        </CardContent>
      </Card>
    );
  }

  // Aggregate durations across all agents
  const statusTotals: Record<string, number> = {};
  
  Object.values(summary).forEach((agentSummary) => {
    Object.entries(agentSummary.stateDurations).forEach(([status, duration]) => {
      statusTotals[status] = (statusTotals[status] || 0) + duration;
    });
  });

  const chartData = Object.entries(statusTotals).map(([status, duration]) => ({
    name: status,
    value: Math.round(duration / 60), // Convert to minutes
    duration: duration,
  }));

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload[0]) {
      const data = payload[0].payload;
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-md">
          <p className="font-semibold">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            {formatTime(data.duration)} ({data.value} minutes)
          </p>
        </div>
      );
    }
    return null;
  };

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.05) return null; // Don't show labels for slices less than 5%
    
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        className="text-xs font-medium"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Status Distribution</CardTitle>
        <p className="text-sm text-muted-foreground">
          Click on a status to filter the table
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomizedLabel}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
              onClick={(data) => {
                if (selectedStatus === data.name) {
                  onStatusClick("all");
                } else {
                  onStatusClick(data.name);
                }
              }}
              className="cursor-pointer"
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={STATUS_COLORS[entry.name as keyof typeof STATUS_COLORS] || "#8884d8"}
                  stroke={selectedStatus === entry.name ? "#000" : "none"}
                  strokeWidth={selectedStatus === entry.name ? 2 : 0}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              verticalAlign="bottom" 
              height={36}
              formatter={(value) => (
                <span 
                  className={`cursor-pointer ${selectedStatus === value ? 'font-bold' : ''}`}
                  onClick={() => {
                    if (selectedStatus === value) {
                      onStatusClick("all");
                    } else {
                      onStatusClick(value);
                    }
                  }}
                >
                  {value}
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default StatusDistributionChart;