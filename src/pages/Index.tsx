import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Monitor } from "lucide-react";
import { config } from "@/config";
import DashboardFilters from "@/components/DashboardFilters";
import KPISummaryCards from "@/components/KPISummaryCards";
import EnhancedAgentStatusTable from "@/components/EnhancedAgentStatusTable";
import ManagerTimeline from "@/components/ManagerTimeline";
import StatusDistributionChart from "@/components/StatusDistributionChart";
import DailyTrendsChart from "@/components/DailyTrendsChart";

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

interface APIResponse {
  items: APIAgentState[];
  summary: Record<string, AgentSummary>;
}

const Index = () => {
  const [data, setData] = useState<APIAgentState[]>([]);
  const [apiData, setApiData] = useState<APIResponse | null>(null);
  const [filteredData, setFilteredData] = useState<APIAgentState[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const { toast } = useToast();

  // Get unique agent names
  const agents = Array.from(new Set(data.map(item => item.AgentName)));

  const fetchData = async (date: string) => {
    setIsLoading(true);
    console.log(`Fetching data for date: ${date}`);
    
    try {
      const url = `${config.API_BASE_URL}/agent-states?date=${date}`;
      console.log(`Making request to: ${url}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        mode: 'cors',
      });
      
      console.log(`Response status: ${response.status}`);
      console.log(`Response headers:`, response.headers);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`HTTP error! status: ${response.status}, body: ${errorText}`);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }
      
      const apiData: APIResponse = await response.json();
      console.log('API Response:', apiData);
      
      // Validate response structure
      if (!apiData.items || !Array.isArray(apiData.items)) {
        console.error('Invalid API response: missing or invalid items array', apiData);
        throw new Error('Invalid API response format: items array not found');
      }
      
      if (!apiData.summary || typeof apiData.summary !== 'object') {
        console.warn('API response missing summary object', apiData);
      }
      
      // Transform API data to pass directly to components
      setData(apiData.items); // Pass raw API data
      setApiData(apiData);
      
      toast({
        title: "Data loaded successfully",
        description: `Loaded ${apiData.items.length} agent state records for ${date}`,
      });
      
    } catch (error) {
      console.error('Failed to fetch data:', error);
      
      // More specific error messages
      let errorMessage = "Unable to fetch agent state data.";
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        errorMessage = "Network error: Unable to connect to the API. This might be due to CORS restrictions or the API being unavailable.";
      } else if (error instanceof Error) {
        errorMessage = `API Error: ${error.message}`;
      }
      
      toast({
        title: "Failed to load data",
        description: errorMessage,
        variant: "destructive",
      });
      
      // Set empty data to show "no data" state in components
      setData([]);
      setApiData(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    // Filter data based on selected agent and status
    let filtered = data;
    
    if (selectedAgent !== "all") {
      filtered = filtered.filter(item => item.AgentName === selectedAgent);
    }
    
    if (selectedStatus !== "all" && !selectedStatus.includes(",")) {
      // Single status filter
      filtered = filtered.filter(item => item.Status === selectedStatus);
    } else if (selectedStatus.includes(",")) {
      // Multiple status filter (comma-separated)
      const statuses = selectedStatus.split(",");
      filtered = filtered.filter(item => statuses.includes(item.Status));
    }
    
    setFilteredData(filtered);
  }, [data, selectedAgent, selectedStatus]);

  const handleRefresh = async () => {
    await fetchData(selectedDate);
    toast({
      title: "Data refreshed",
      description: "Agent state data has been updated successfully.",
    });
  };

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    toast({
      title: "Date filter applied",
      description: `Showing data for ${date}`,
    });
  };

  const handleAgentChange = (agent: string) => {
    setSelectedAgent(agent);
  };

  const handleStatusChange = (status: string) => {
    setSelectedStatus(status);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Clean Header */}
      <header className="bg-dashboard-header border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Monitor className="h-8 w-8 text-primary" />
              <h1 className="text-xl font-semibold text-foreground">
                {config.APP_NAME}
              </h1>
            </div>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        <KPISummaryCards data={filteredData} summary={apiData?.summary} />
        
        <DashboardFilters
          onRefresh={handleRefresh}
          onDateChange={handleDateChange}
          onAgentChange={handleAgentChange}
          onStatusChange={handleStatusChange}
          agents={agents}
          isLoading={isLoading}
        />
        
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
          <StatusDistributionChart 
            summary={apiData?.summary} 
            onStatusClick={handleStatusChange}
            selectedStatus={selectedStatus}
          />
          <DailyTrendsChart data={apiData?.items || []} />
        </div>
        
        <div className="space-y-6">
          <EnhancedAgentStatusTable data={filteredData} />
          <ManagerTimeline data={apiData?.items || []} />
          
          {!apiData || apiData.items.length === 0 && (
            <div className="text-center py-12 text-muted-foreground bg-card border border-border rounded-lg">
              <p className="text-lg mb-2">No agent activity found</p>
              <p className="text-sm">No agent activity found for the selected date.</p>
              <p className="text-sm">Try selecting a different date or check if the API is working correctly.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;
