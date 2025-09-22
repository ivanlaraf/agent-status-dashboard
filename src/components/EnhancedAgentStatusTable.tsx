import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpDown, Search, AlertTriangle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import LiveSessionCounter from "@/components/LiveSessionCounter";
import { formatTime, formatDuration, calculateDuration, consolidateConsecutiveStates, calculateAgentStatusSummaries, isLiveSession, detectUnusualBehavior } from "@/lib/timeUtils";

interface APIAgentState {
  StartTime: string;
  AgentId: string;
  EndTime: string;
  Status: string;
  Duration: number;
  AgentName: string;
}

interface EnhancedAgentStatusTableProps {
  data: APIAgentState[];
}

interface ProcessedAgentState extends APIAgentState {
  calculatedDuration: number; // in seconds
}

type SortField = 'AgentName' | 'Status' | 'StartTime' | 'calculatedDuration';
type SortOrder = 'asc' | 'desc';

const getStatusColor = (status: string) => {
  switch (status) {
    case "Available":
      return "bg-status-available text-white";
    case "Busy":
      return "bg-status-busy text-white";
    case "Offline":
      return "bg-status-offline text-white";
    case "Disconnect":
    case "Disconnected":
      return "bg-status-disconnect text-white";
    default:
      return "bg-muted text-muted-foreground";
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "Available":
      return "✔️";
    case "Busy":
      return "⏸️";
    case "Offline":
      return "⚪";
    case "Disconnect":
    case "Disconnected":
      return "🔌";
    default:
      return "❓";
  }
};

const EnhancedAgentStatusTable = ({ data }: EnhancedAgentStatusTableProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>('StartTime');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Process and consolidate data
  const processedData = useMemo(() => {
    // Group by agent first
    const agentGroups = data.reduce((acc, item) => {
      if (!acc[item.AgentName]) {
        acc[item.AgentName] = [];
      }
      acc[item.AgentName].push(item);
      return acc;
    }, {} as Record<string, APIAgentState[]>);

    // Consolidate consecutive states for each agent
    const allConsolidated: ProcessedAgentState[] = [];
    Object.entries(agentGroups).forEach(([agentName, states]) => {
      const consolidated = consolidateConsecutiveStates(states);
      consolidated.forEach(item => {
        let calculatedDuration = 0;
        if (item.Duration && !isNaN(item.Duration) && item.Duration > 0) {
          calculatedDuration = item.Duration;
        } else {
          calculatedDuration = calculateDuration(item.StartTime, item.EndTime);
        }

        allConsolidated.push({
          ...item,
          calculatedDuration
        });
      });
    });

    return allConsolidated;
  }, [data]);

  // Calculate agent summaries and alerts
  const { agentSummaries, behaviorAlerts } = useMemo(() => {
    const summaries: Record<string, Record<string, number>> = {};
    
    // Group original data by agent
    const agentGroups = data.reduce((acc, item) => {
      if (!acc[item.AgentName]) {
        acc[item.AgentName] = [];
      }
      acc[item.AgentName].push(item);
      return acc;
    }, {} as Record<string, APIAgentState[]>);

    // Calculate summaries for each agent
    Object.entries(agentGroups).forEach(([agentName, states]) => {
      summaries[agentName] = calculateAgentStatusSummaries(states);
    });

    // Detect unusual behavior
    const alerts = detectUnusualBehavior(data);
    const alertMap = alerts.reduce((acc, item) => {
      acc[item.agent] = item.alerts;
      return acc;
    }, {} as Record<string, string[]>);

    return { agentSummaries: summaries, behaviorAlerts: alertMap };
  }, [data]);

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    let filtered = processedData.filter(item =>
      item.AgentName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    filtered.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortField) {
        case 'AgentName':
          aValue = a.AgentName;
          bValue = b.AgentName;
          break;
        case 'Status':
          aValue = a.Status;
          bValue = b.Status;
          break;
        case 'StartTime':
          aValue = a.StartTime;
          bValue = b.StartTime;
          break;
        case 'calculatedDuration':
          aValue = a.calculatedDuration;
          bValue = b.calculatedDuration;
          break;
        default:
          aValue = a.AgentName;
          bValue = b.AgentName;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      }

      return 0;
    });

    return filtered;
  }, [processedData, searchTerm, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };


  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => {
    const isActive = sortField === field;
    const isAsc = sortOrder === 'asc';
    
    return (
      <Button
        variant="ghost"
        onClick={() => handleSort(field)}
        className="h-auto p-0 font-semibold text-left justify-start hover:bg-accent/50 transition-colors"
      >
        {children}
        <div className="ml-1 flex flex-col">
          <div className={`h-1 w-2 ${isActive && !isAsc ? 'text-primary' : 'text-muted-foreground/50'}`}>▲</div>
          <div className={`h-1 w-2 ${isActive && isAsc ? 'text-primary' : 'text-muted-foreground/50'}`}>▼</div>
        </div>
      </Button>
    );
  };

  return (
    <div className="space-y-4">
      {/* Search Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search agents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block space-y-4">
        {/* Agent Summaries */}
        {Object.keys(agentSummaries).length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-muted-foreground">Per-Agent Status Summary</h4>
            <div className="grid gap-3">
              {Object.entries(agentSummaries)
                .filter(([agentName]) => agentName.toLowerCase().includes(searchTerm.toLowerCase()))
                .map(([agentName, summary]) => (
                <div key={agentName} className="bg-card border border-border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-medium">{agentName}</h5>
                    {behaviorAlerts[agentName] && behaviorAlerts[agentName].length > 0 && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge variant="destructive" className="flex items-center gap-1 text-xs">
                              <AlertTriangle className="h-3 w-3" />
                              Alert
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <div className="space-y-1">
                              <div className="font-semibold text-sm">⚠️ Issues Detected:</div>
                              {behaviorAlerts[agentName].map((alert, idx) => (
                                <div key={idx} className="text-xs bg-destructive/10 p-1 rounded">• {alert}</div>
                              ))}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3 text-sm">
                    {Object.entries(summary).map(([status, duration]) => (
                      duration > 0 && (
                        <div key={status} className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded ${getStatusColor(status).replace('text-white', '')}`}></div>
                          <span className="text-muted-foreground">{status}:</span>
                          <span className="font-mono font-medium">{formatDuration(duration)}</span>
                        </div>
                      )
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Consolidated Data Table */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>
                  <SortButton field="AgentName">Agent</SortButton>
                </TableHead>
                <TableHead>
                  <SortButton field="Status">Status</SortButton>
                </TableHead>
                <TableHead>
                  <SortButton field="StartTime">Start Time</SortButton>
                </TableHead>
                <TableHead>End Time</TableHead>
                <TableHead>
                  <SortButton field="calculatedDuration">Duration</SortButton>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedData.map((row, index) => (
                <TableRow key={index} className="hover:bg-accent/50 transition-all duration-200 hover:shadow-sm">
                  <TableCell className="font-medium">{row.AgentName}</TableCell>
                  <TableCell>
                    <Badge className={`${getStatusColor(row.Status)} font-medium flex items-center gap-1`}>
                      <span>{getStatusIcon(row.Status)}</span>
                      {row.Status}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{formatTime(row.StartTime)}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {isLiveSession(row.EndTime) ? (
                      <LiveSessionCounter startTime={row.StartTime} />
                    ) : (
                      formatTime(row.EndTime)
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-sm">{formatDuration(row.calculatedDuration)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {/* Mobile Agent Summaries */}
        {Object.keys(agentSummaries).length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-muted-foreground">Per-Agent Summary</h4>
            {Object.entries(agentSummaries)
              .filter(([agentName]) => agentName.toLowerCase().includes(searchTerm.toLowerCase()))
              .map(([agentName, summary]) => (
              <Card key={agentName}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{agentName}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {Object.entries(summary).map(([status, duration]) => (
                      duration > 0 && (
                        <div key={status} className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded ${getStatusColor(status).replace('text-white', '')}`}></div>
                          <span className="text-muted-foreground text-xs">{status}:</span>
                          <span className="font-mono text-xs font-medium">{formatDuration(duration)}</span>
                        </div>
                      )
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        
        {/* Mobile Data Cards */}
        <div className="space-y-3">
          {filteredAndSortedData.map((row, index) => (
            <Card key={index} className="transition-all duration-200 hover:shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>{row.AgentName}</span>
                  <Badge className={`${getStatusColor(row.Status)} font-medium flex items-center gap-1`}>
                    <span>{getStatusIcon(row.Status)}</span>
                    {row.Status}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Start Time:</span>
                    <div className="font-mono font-medium">{formatTime(row.StartTime)}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">End Time:</span>
                    <div className="font-mono font-medium">
                      {isLiveSession(row.EndTime) ? (
                        <LiveSessionCounter startTime={row.StartTime} />
                      ) : (
                        formatTime(row.EndTime)
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Duration:</span>
                    <div className="font-mono font-medium">{formatDuration(row.calculatedDuration)}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {filteredAndSortedData.length === 0 && data.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-lg mb-2">No agent activity found</p>
          <p className="text-sm">No agent activity found for the selected date and filters.</p>
          <p className="text-sm">Try selecting a different date or clearing the filters.</p>
        </div>
      )}

      {filteredAndSortedData.length === 0 && data.length > 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-lg mb-2">No agents found</p>
          <p className="text-sm">No agents found matching your search term.</p>
          <p className="text-sm">Try adjusting your search or clearing the search field.</p>
        </div>
      )}
    </div>
  );
};

export default EnhancedAgentStatusTable;