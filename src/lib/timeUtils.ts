// Time and duration formatting utilities

// Convert UTC timestamp to local timezone
export const convertUTCToLocal = (utcTimestamp: string | null | undefined): Date | null => {
  if (!utcTimestamp) return null;
  
  try {
    // Handle ISO timestamp
    if (utcTimestamp.includes('T')) {
      return new Date(utcTimestamp);
    }
    
    // Handle other formats by assuming UTC
    return new Date(utcTimestamp + 'Z');
  } catch (error) {
    console.warn('Failed to parse UTC timestamp:', utcTimestamp, error);
    return null;
  }
};

// Format timestamp as YYYY-MM-DD HH:mm:ss in local timezone
export const formatDateTime = (timeString: string | null | undefined): string => {
  if (!timeString) return "--:--:--";
  
  const localDate = convertUTCToLocal(timeString);
  if (!localDate) return "--:--:--";
  
  return localDate.toLocaleString('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).replace(',', '');
};

// Format time only (HH:mm:ss) in local timezone
export const formatTime = (timeString: string | null | undefined): string => {
  if (!timeString) {
    return '--:--:--';
  }

  try {
    const localDate = convertUTCToLocal(timeString);
    if (!localDate) {
      return '--:--:--';
    }
    
    return localDate.toLocaleTimeString('en-US', {
      hour12: false, // 24-hour format
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch (error) {
    console.error('Error formatting time:', error, timeString);
    return '--:--:--';
  }
};

export const isLiveSession = (endTime: string | null | undefined): boolean => {
  return !endTime || endTime === null || endTime === '';
};

export const formatDuration = (seconds: number | null | undefined): string => {
  if (!seconds || isNaN(seconds)) return "0s";
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${remainingSeconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  } else {
    return `${remainingSeconds}s`;
  }
};

export const formatDurationShort = (seconds: number | null | undefined): string => {
  if (!seconds || isNaN(seconds)) return "0s";
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
};

export const parseDurationString = (durationStr: string): number => {
  if (!durationStr || typeof durationStr !== 'string') return 0;
  
  // Handle formats like "2m 15s", "1h 30m", "45s"
  let totalSeconds = 0;
  
  const hourMatch = durationStr.match(/(\d+)h/);
  const minuteMatch = durationStr.match(/(\d+)m/);
  const secondMatch = durationStr.match(/(\d+)s/);
  
  if (hourMatch) totalSeconds += parseInt(hourMatch[1]) * 3600;
  if (minuteMatch) totalSeconds += parseInt(minuteMatch[1]) * 60;
  if (secondMatch) totalSeconds += parseInt(secondMatch[1]);
  
  return totalSeconds;
};

// Consolidate consecutive states with the same status and micro-events
export const consolidateConsecutiveStates = (states: any[], microEventThreshold: number = 60): any[] => {
  if (!states || states.length === 0) return [];
  
  // Sort by start time first
  const sortedStates = [...states].sort((a, b) => 
    parseTimeToSeconds(a.StartTime) - parseTimeToSeconds(b.StartTime)
  );
  
  const consolidated: any[] = [];
  let currentBlock = { ...sortedStates[0] };
  
  for (let i = 1; i < sortedStates.length; i++) {
    const current = sortedStates[i];
    const normalizedCurrentStatus = current.Status === "Disconnected" ? "Disconnect" : current.Status;
    const normalizedBlockStatus = currentBlock.Status === "Disconnected" ? "Disconnect" : currentBlock.Status;
    
    const currentDuration = current.Duration || calculateDuration(current.StartTime, current.EndTime);
    
    // If same status, extend the current block
    if (normalizedCurrentStatus === normalizedBlockStatus) {
      currentBlock.EndTime = current.EndTime;
      // Recalculate duration for the consolidated block
      currentBlock.Duration = calculateDuration(currentBlock.StartTime, currentBlock.EndTime);
    } else {
      // Check if current event is a micro-event that should be absorbed into adjacent state
      if (currentDuration < microEventThreshold && consolidated.length > 0) {
        // If micro-event, extend the previous block instead of creating new one
        const prevBlock = consolidated[consolidated.length - 1];
        if (prevBlock.Status === normalizedBlockStatus) {
          prevBlock.EndTime = current.EndTime;
          prevBlock.Duration = calculateDuration(prevBlock.StartTime, prevBlock.EndTime);
          continue;
        }
      }
      
      // Different status, save current block and start new one
      consolidated.push({ ...currentBlock });
      currentBlock = { ...current };
    }
  }
  
  // Add the last block
  consolidated.push(currentBlock);
  
  return consolidated;
};

// Calculate enhanced dashboard metrics
export const calculateDashboardMetrics = (states: any[]): {
  totalDisconnections: number;
  availablePercentage: number;
  busyPercentage: number;
  offlinePercentage: number;
  longestContinuousAvailable: number;
  totalDuration: number;
} => {
  if (!states || states.length === 0) {
    return {
      totalDisconnections: 0,
      availablePercentage: 0,
      busyPercentage: 0,
      offlinePercentage: 0,
      longestContinuousAvailable: 0,
      totalDuration: 0
    };
  }

  // Group by agent for proper calculation
  const agentGroups = states.reduce((acc, item) => {
    const agentName = item.AgentName || item.agentName;
    if (!acc[agentName]) {
      acc[agentName] = [];
    }
    acc[agentName].push(item);
    return acc;
  }, {} as Record<string, any[]>);

  let totalDisconnections = 0;
  let totalAvailableTime = 0;
  let totalBusyTime = 0;
  let totalOfflineTime = 0;
  let totalDisconnectTime = 0;
  let longestContinuousAvailable = 0;

    Object.values(agentGroups).forEach(agentStates => {
      const consolidated = consolidateConsecutiveStates(agentStates as any[], 60); // 1 minute threshold
    
    consolidated.forEach(state => {
      const duration = state.Duration || calculateDuration(state.StartTime, state.EndTime);
      const normalizedStatus = state.Status === "Disconnected" ? "Disconnect" : state.Status;
      
      switch (normalizedStatus) {
        case "Available":
          totalAvailableTime += duration;
          longestContinuousAvailable = Math.max(longestContinuousAvailable, duration);
          break;
        case "Busy":
          totalBusyTime += duration;
          break;
        case "Offline":
          totalOfflineTime += duration;
          break;
        case "Disconnect":
          totalDisconnectTime += duration;
          totalDisconnections++;
          break;
      }
    });
  });

  const totalDuration = totalAvailableTime + totalBusyTime + totalOfflineTime + totalDisconnectTime;
  
  return {
    totalDisconnections,
    availablePercentage: totalDuration > 0 ? Math.round((totalAvailableTime / totalDuration) * 100) : 0,
    busyPercentage: totalDuration > 0 ? Math.round((totalBusyTime / totalDuration) * 100) : 0,
    offlinePercentage: totalDuration > 0 ? Math.round(((totalOfflineTime + totalDisconnectTime) / totalDuration) * 100) : 0,
    longestContinuousAvailable,
    totalDuration
  };
};

// Calculate per-agent status summaries
export const calculateAgentStatusSummaries = (states: any[]): Record<string, number> => {
  const summary: Record<string, number> = {
    'Available': 0,
    'Busy': 0,
    'Offline': 0,
    'Disconnect': 0
  };
  
  states.forEach(state => {
    const normalizedStatus = state.Status === "Disconnected" ? "Disconnect" : state.Status;
    const duration = state.Duration || calculateDuration(state.StartTime, state.EndTime);
    if (summary[normalizedStatus] !== undefined) {
      summary[normalizedStatus] += duration;
    }
  });
  
  return summary;
};

// Convert timestamp to seconds since start of day (local timezone)
export const parseTimeToSeconds = (timeString: string | null | undefined): number => {
  if (!timeString) return 0;
  
  try {
    const localDate = convertUTCToLocal(timeString);
    if (!localDate) return 0;
    
    const hours = localDate.getHours();
    const minutes = localDate.getMinutes();
    const seconds = localDate.getSeconds();
    
    return hours * 3600 + minutes * 60 + seconds;
  } catch (error) {
    console.warn('Failed to parse time string:', timeString, error);
    return 0;
  }
};

// Calculate duration between two timestamps
export const calculateDuration = (startTime: string | null | undefined, endTime: string | null | undefined): number => {
  if (!startTime) {
    return 0;
  }

  try {
    const startDate = convertUTCToLocal(startTime);
    if (!startDate) {
      return 0;
    }

    let endDate: Date;
    if (!endTime || isLiveSession(endTime)) {
      // If no end time, use current time for live sessions
      endDate = new Date();
    } else {
      const convertedEndDate = convertUTCToLocal(endTime);
      if (!convertedEndDate) {
        return 0;
      }
      endDate = convertedEndDate;
    }

    const durationMs = endDate.getTime() - startDate.getTime();
    return Math.max(0, Math.floor(durationMs / 1000));
  } catch (error) {
    console.error('Error calculating duration:', error, { startTime, endTime });
    return 0;
  }
};

export const detectUnusualBehavior = (states: any[]): { agent: string; alerts: string[] }[] => {
  const agentGroups = states.reduce((acc, item) => {
    const agentName = item.AgentName || item.agentName;
    if (!acc[agentName]) {
      acc[agentName] = [];
    }
    acc[agentName].push(item);
    return acc;
  }, {} as Record<string, any[]>);

  return Object.entries(agentGroups).map(([agent, agentStates]) => {
    const alerts: string[] = [];
    
    // Count disconnections
    const disconnections = (agentStates as any[]).filter(s => 
      s.Status === 'Disconnect' || s.Status === 'Disconnected'
    ).length;
    if (disconnections >= 5) {
      alerts.push(`Frequent disconnects (${disconnections} times today)`);
    } else if (disconnections >= 3) {
      alerts.push(`Multiple disconnects (${disconnections} times)`);
    }
    
    // Check for long offline periods (>20 minutes during shift)
      const consolidated = consolidateConsecutiveStates(agentStates as any[], 60); // 1 minute threshold
      const longOffline = consolidated.find(s => {
      if (s.Status !== 'Offline') return false;
      const duration = s.Duration || calculateDuration(s.StartTime, s.EndTime);
      return duration > 1200; // 20 minutes
    });
    if (longOffline) {
      const duration = longOffline.Duration || calculateDuration(longOffline.StartTime, longOffline.EndTime);
      alerts.push(`Agent offline >${formatDurationShort(duration)} during shift`);
    }
    
    // Check for very short sessions (less than 5 minutes total)
    const totalDuration = consolidated.reduce((sum, state) => {
      const duration = state.Duration || calculateDuration(state.StartTime, state.EndTime);
      return sum + duration;
    }, 0);
    if (totalDuration < 300 && consolidated.length > 1) { // Less than 5 minutes total
      alerts.push(`Very short work session (${formatDurationShort(totalDuration)})`);
    }
    
    return { agent, alerts };
  }).filter(item => item.alerts.length > 0);
};