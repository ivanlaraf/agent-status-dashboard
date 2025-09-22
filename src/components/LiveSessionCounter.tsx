import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { calculateDuration, formatDuration } from "@/lib/timeUtils";

interface LiveSessionCounterProps {
  startTime: string;
  className?: string;
}

const LiveSessionCounter = ({ startTime, className = "" }: LiveSessionCounterProps) => {
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const updateDuration = () => {
      const currentDuration = calculateDuration(startTime, null);
      setDuration(currentDuration);
    };

    // Update immediately
    updateDuration();

    // Update every second
    const interval = setInterval(updateDuration, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  return (
    <Badge variant="outline" className={`bg-status-available/10 text-status-available border-status-available ${className}`}>
      🟢 Live - {formatDuration(duration)} and counting
    </Badge>
  );
};

export default LiveSessionCounter;