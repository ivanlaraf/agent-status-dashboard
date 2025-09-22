import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Clock, Activity, TrendingUp, PhoneCall, AlertTriangle } from "lucide-react";
import { formatDurationShort, parseDurationString, calculateDashboardMetrics } from "@/lib/timeUtils";

interface APIAgentState {
  StartTime: string;
  AgentId: string;
  EndTime: string;
  Status: string;
  Duration: number;
  AgentName: string;
}

interface AgentSummary {
  stateCounts: Record<string, number>;
  stateDurations: Record<string, number>;
}

interface KPISummaryCardsProps {
  data: APIAgentState[];
  summary?: Record<string, AgentSummary>;
}

const KPISummaryCards = ({ data, summary }: KPISummaryCardsProps) => {
  // Calculate unique agents from summary if available, otherwise from data
  const uniqueAgents = summary ? Object.keys(summary).length : new Set(data.map(item => item.AgentName)).size;
  
  // Calculate enhanced metrics
  const dashboardMetrics = calculateDashboardMetrics(data);

  const parseSummaryDurations = (summary: Record<string, AgentSummary>) => {
    let totalAvailable = 0;
    let totalBusy = 0;
    let totalOffline = 0;
    let totalDisconnect = 0;
    let agentCount = 0;

    Object.values(summary).forEach((agentSummary) => {
      agentCount++;
      Object.entries(agentSummary.stateDurations).forEach(([status, durationStr]) => {
        const seconds = typeof durationStr === 'string' ? parseDurationString(durationStr) : durationStr;
        
        switch (status) {
          case "Available":
            totalAvailable += seconds;
            break;
          case "Busy":
            totalBusy += seconds;
            break;
          case "Offline":
            totalOffline += seconds;
            break;
          case "Disconnect":
          case "Disconnected":
            totalDisconnect += seconds;
            break;
        }
      });
    });

    const totalDuration = totalAvailable + totalBusy + totalOffline + totalDisconnect;
    const availablePercentage = totalDuration > 0 ? Math.round((totalAvailable / totalDuration) * 100) : 0;

    return {
      totalAvailable,
      totalBusy,
      totalOffline: totalOffline + totalDisconnect,
      totalDuration,
      agentCount,
      avgAvailable: agentCount > 0 ? totalAvailable / agentCount : 0,
      avgOffline: agentCount > 0 ? (totalOffline + totalDisconnect) / agentCount : 0,
      availablePercentage
    };
  };

  // Calculate totals from summary data if available
  const calculateTotals = () => {
    if (!summary) {
      // Fallback to data-based calculations
      const availableCount = data.filter(item => item.Status === "Available").length;
      const busyCount = data.filter(item => item.Status === "Busy").length;
      const totalCount = data.length;
      const availablePercentage = totalCount > 0 ? Math.round((availableCount / totalCount) * 100) : 0;
      
      return {
        totalAvailable: availableCount,
        totalBusy: busyCount,
        totalOffline: data.filter(item => item.Status === "Offline").length,
        availablePercentage,
        avgAvailable: 0,
        avgOffline: 0
      };
    }

    return parseSummaryDurations(summary);
  };

  const totals = calculateTotals();

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <Users className="h-4 w-4 text-kpi-agents" />
                <div className="text-2xl font-bold text-kpi-agents">{uniqueAgents}</div>
              </div>
              <p className="text-xs text-muted-foreground">
                Total Active Agents
              </p>
              <div className="text-xs text-kpi-agents">
                Currently tracked
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <Clock className="h-4 w-4 text-status-available" />
                <div className="text-2xl font-bold text-status-available">{dashboardMetrics.availablePercentage}%</div>
              </div>
              <p className="text-xs text-muted-foreground">
                % Time Available
              </p>
              <div className="text-xs text-status-available">
                Team availability
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <Activity className="h-4 w-4 text-status-busy" />
                <div className="text-2xl font-bold text-status-busy">{dashboardMetrics.busyPercentage}%</div>
              </div>
              <p className="text-xs text-muted-foreground">
                % Time Busy
              </p>
              <div className="text-xs text-status-busy">
                Active work time
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <PhoneCall className="h-4 w-4 text-status-offline" />
                <div className="text-2xl font-bold text-status-offline">{dashboardMetrics.offlinePercentage}%</div>
              </div>
              <p className="text-xs text-muted-foreground">
                % Time Offline
              </p>
              <div className="text-xs text-status-offline">
                Unavailable time
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <AlertTriangle className="h-4 w-4 text-status-disconnect" />
                <div className="text-2xl font-bold text-status-disconnect">{dashboardMetrics.totalDisconnections}</div>
              </div>
              <p className="text-xs text-muted-foreground">
                Total Disconnections
              </p>
              <div className="text-xs text-status-disconnect">
                Connection issues
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-status-available" />
                <div>
                  <p className="text-sm font-medium">Longest Continuous Available Period</p>
                  <p className="text-xs text-muted-foreground">Best performance today</p>
                </div>
              </div>
              <div className="text-xl font-bold text-status-available">
                {formatDurationShort(dashboardMetrics.longestContinuousAvailable)}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default KPISummaryCards;