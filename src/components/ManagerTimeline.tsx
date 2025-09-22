import { useMemo, useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";
import { 
  consolidateConsecutiveStates, 
  formatTime, 
  formatDuration, 
  calculateDuration, 
  parseTimeToSeconds,
  isLiveSession,
  detectUnusualBehavior
} from "@/lib/timeUtils";

interface APIAgentState {
  StartTime: string;
  AgentId: string;
  EndTime: string;
  Status: string;
  Duration: number;
  AgentName: string;
}

interface ManagerTimelineProps {
  data: APIAgentState[];
}

interface TimelineEntry {
  agent: string;
  segments: {
    status: string;
    startTime: string;
    endTime: string;
    duration: number;
    left: number;
    width: number;
    isLive: boolean;
  }[];
  rawSegments: {
    status: string;
    startTime: string;
    endTime: string;
    duration: number;
    left: number;
    width: number;
    isLive: boolean;
  }[];
  alerts: string[];
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "Available":
      return "bg-status-available";
    case "Busy":
      return "bg-status-busy";
    case "Offline":
      return "bg-status-offline";
    case "Disconnect":
    case "Disconnected":
      return "bg-status-disconnect";
    default:
      return "bg-muted";
  }
};

const ManagerTimeline = ({ data }: ManagerTimelineProps) => {
  const [expandedAgents, setExpandedAgents] = useState<Set<string>>(new Set());
  
  const toggleAgentExpansion = (agent: string) => {
    const newExpanded = new Set(expandedAgents);
    if (newExpanded.has(agent)) {
      newExpanded.delete(agent);
    } else {
      newExpanded.add(agent);
    }
    setExpandedAgents(newExpanded);
  };

  // Process data for manager view
  const timelineData: TimelineEntry[] = useMemo(() => {
    const agentGroups = data.reduce((acc, item) => {
      if (!acc[item.AgentName]) {
        acc[item.AgentName] = [];
      }
      acc[item.AgentName].push(item);
      return acc;
    }, {} as Record<string, APIAgentState[]>);

    // Detect unusual behavior
    const behaviorAlerts = detectUnusualBehavior(data);
    const alertMap = behaviorAlerts.reduce((acc, item) => {
      acc[item.agent] = item.alerts;
      return acc;
    }, {} as Record<string, string[]>);

    // Convert to timeline entries with consolidated states
    return Object.entries(agentGroups).map(([agent, states]) => {
      const consolidatedStates = consolidateConsecutiveStates(states, 60); // 1 minute threshold
      const rawStates = consolidateConsecutiveStates(states, 0); // No consolidation for granular view
      
      const processSegments = (statesToProcess: typeof states) => {
        const segments = [];
        const startOfDay = 9 * 3600; // 9 AM
        const endOfDay = 18 * 3600; // 6 PM  
        const totalSeconds = endOfDay - startOfDay;
        
        for (const state of statesToProcess) {
          const startSeconds = parseTimeToSeconds(state.StartTime);
          const endSeconds = isLiveSession(state.EndTime) 
            ? parseTimeToSeconds(new Date().toISOString())
            : parseTimeToSeconds(state.EndTime);
          
          // Skip events outside business hours (can be adjusted)
          if (endSeconds < startOfDay || startSeconds > endOfDay) continue;
          
          const adjustedStart = Math.max(startSeconds, startOfDay);
          const adjustedEnd = Math.min(endSeconds, endOfDay);
          
          const left = ((adjustedStart - startOfDay) / totalSeconds) * 100;
          const width = ((adjustedEnd - adjustedStart) / totalSeconds) * 100;
          
          let duration = 0;
          if (state.Duration && !isNaN(state.Duration) && state.Duration > 0) {
            duration = state.Duration;
          } else {
            duration = calculateDuration(state.StartTime, state.EndTime);
          }
          
          segments.push({
            status: state.Status === "Disconnected" ? "Disconnect" : state.Status,
            startTime: state.StartTime,
            endTime: state.EndTime,
            duration,
            left: Math.max(0, left),
            width: Math.max(1, width), // Minimum 1% width
            isLive: isLiveSession(state.EndTime)
          });
        }
        
        return segments;
      };
      
      return { 
        agent, 
        segments: processSegments(consolidatedStates),
        rawSegments: processSegments(rawStates),
        alerts: alertMap[agent] || []
      };
    });
  }, [data]);

  // Generate time labels for business hours
  const timeLabels = useMemo(() => {
    const labels = [];
    for (let hour = 9; hour <= 18; hour += 2) {
      labels.push(`${hour.toString().padStart(2, '0')}:00`);
    }
    return labels;
  }, []);

  return (
    <TooltipProvider>
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Agent Status Timeline</h3>
          <div className="text-sm text-muted-foreground">
            Business Hours: 09:00 - 18:00
          </div>
        </div>
        
        {/* Time scale */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-muted-foreground px-2">
            {timeLabels.map((time) => (
              <span key={time}>{time}</span>
            ))}
          </div>
          <div className="mt-1 h-px bg-border"></div>
        </div>
        
        {/* Timeline rows */}
        <div className="space-y-4">
          {timelineData.map((entry) => (
            <div key={entry.agent} className="space-y-2">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-muted"
                  onClick={() => toggleAgentExpansion(entry.agent)}
                >
                  {expandedAgents.has(entry.agent) ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                </Button>
                <span className="font-medium text-sm cursor-pointer" onClick={() => toggleAgentExpansion(entry.agent)}>
                  {entry.agent}
                </span>
                {entry.alerts.length > 0 && (
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
                        {entry.alerts.map((alert, idx) => (
                          <div key={idx} className="text-xs bg-destructive/10 p-1 rounded">• {alert}</div>
                        ))}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
              
              {/* Manager View - Consolidated Timeline */}
              <div className="relative h-6 bg-timeline-background rounded overflow-hidden">
                {entry.segments.map((segment, index) => (
                  <Tooltip key={index}>
                    <TooltipTrigger asChild>
                      <div
                        className={`absolute h-full ${getStatusColor(segment.status)} transition-all duration-200 hover:opacity-90 cursor-pointer ${
                          segment.isLive ? 'animate-pulse' : ''
                        }`}
                        style={{
                          left: `${segment.left}%`,
                          width: `${segment.width}%`,
                        }}
                      >
                        <div className="h-full flex items-center justify-center">
                          {segment.width > 8 && (
                            <span className="text-xs text-white font-medium truncate px-1">
                              {segment.status}
                            </span>
                          )}
                          {segment.isLive && segment.width > 4 && (
                            <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/50 animate-pulse"></div>
                          )}
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="space-y-1">
                        <div className="font-semibold">{entry.agent}</div>
                        <div className="font-medium">{segment.status}</div>
                        <div className="text-sm">Start: {formatTime(segment.startTime)}</div>
                        <div className="text-sm">End: {segment.isLive ? 'Live Session' : formatTime(segment.endTime)}</div>
                        <div className="text-sm">Duration: {formatDuration(segment.duration)}</div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>

              {/* Additional Details (Expanded) */}
              {expandedAgents.has(entry.agent) && (
                <div className="ml-8 space-y-2 border-l-2 border-muted pl-4">
                  <div className="text-xs text-muted-foreground font-medium">Detailed Events</div>
                  <div className="relative h-4 bg-timeline-background rounded overflow-hidden">
                    {entry.rawSegments.map((segment, index) => (
                      <Tooltip key={index}>
                        <TooltipTrigger asChild>
                          <div
                            className={`absolute h-full ${getStatusColor(segment.status)} transition-all duration-200 hover:opacity-90 cursor-pointer ${
                              segment.isLive ? 'animate-pulse' : ''
                            }`}
                            style={{
                              left: `${segment.left}%`,
                              width: `${segment.width}%`,
                            }}
                          >
                            <div className="h-full flex items-center justify-center">
                              {segment.width > 4 && (
                                <span className="text-xs text-white font-medium truncate px-1">
                                  {segment.status}
                                </span>
                              )}
                              {segment.isLive && segment.width > 2 && (
                                <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-white/50 animate-pulse"></div>
                              )}
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="space-y-1">
                            <div className="font-semibold">{entry.agent}</div>
                            <div className="font-medium">{segment.status}</div>
                            <div className="text-sm">Start: {formatTime(segment.startTime)}</div>
                            <div className="text-sm">End: {segment.isLive ? 'Live' : formatTime(segment.endTime)}</div>
                            <div className="text-sm">Duration: {formatDuration(segment.duration)}</div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        
        {/* Legend */}
        <div className="mt-6 pt-4 border-t border-border">
          <div className="flex justify-between items-start">
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-status-available rounded"></div>
                <span>Available</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-status-busy rounded"></div>
                <span>Busy</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-status-offline rounded"></div>
                <span>Offline</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-status-disconnect rounded"></div>
                <span>Disconnect</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-muted animate-pulse rounded"></div>
                <span>Live Session</span>
              </div>
            </div>
            
            <div className="text-xs text-muted-foreground">
              <div>Click agent names to expand detailed view</div>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default ManagerTimeline;