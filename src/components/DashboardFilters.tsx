import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Calendar, Users, Filter } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface DashboardFiltersProps {
  onRefresh: () => void;
  onDateChange: (date: string) => void;
  onAgentChange: (agent: string) => void;
  onStatusChange?: (status: string) => void;
  agents: string[];
  isLoading?: boolean;
}

const DashboardFilters = ({ onRefresh, onDateChange, onAgentChange, onStatusChange, agents, isLoading }: DashboardFiltersProps) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(["Available", "Busy", "Offline", "Disconnect"]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value;
    setSelectedDate(date);
    onDateChange(date);
  };

  const handleStatusToggle = (status: string, checked: boolean) => {
    const updated = checked 
      ? [...selectedStatuses, status]
      : selectedStatuses.filter(s => s !== status);
    setSelectedStatuses(updated);
    
    if (onStatusChange) {
      onStatusChange(updated.length === 4 ? "all" : updated.join(","));
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 mb-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              value={selectedDate}
              onChange={handleDateChange}
              className="w-auto"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <Select onValueChange={onAgentChange}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Agents" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Agents</SelectItem>
                {agents.map((agent) => (
                  <SelectItem key={agent} value={agent}>
                    {agent}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {onStatusChange && (
            <div className="flex items-center gap-3">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <div className="flex items-center gap-4">
                {[
                  { status: "Available", color: "bg-status-available" },
                  { status: "Busy", color: "bg-status-busy" },
                  { status: "Offline", color: "bg-status-offline" },
                  { status: "Disconnect", color: "bg-status-disconnect" }
                ].map(({ status, color }) => (
                  <div key={status} className="flex items-center gap-2">
                    <Checkbox
                      id={`status-${status}`}
                      checked={selectedStatuses.includes(status)}
                      onCheckedChange={(checked) => handleStatusToggle(status, checked as boolean)}
                    />
                    <div className={`w-3 h-3 rounded ${color}`}></div>
                    <label htmlFor={`status-${status}`} className="text-sm font-medium cursor-pointer">
                      {status}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <Button 
          onClick={onRefresh} 
          variant="outline" 
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Data
        </Button>
      </div>
    </div>
  );
};

export default DashboardFilters;