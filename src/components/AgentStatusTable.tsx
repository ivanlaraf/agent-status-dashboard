import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export interface AgentState {
  agent: string;
  status: "Available" | "Busy" | "Offline" | "Disconnect";
  time: string;
}

interface AgentStatusTableProps {
  data: AgentState[];
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "Available":
      return "bg-status-available text-white";
    case "Busy":
      return "bg-status-busy text-white";
    case "Offline":
      return "bg-status-offline text-white";
    case "Disconnect":
      return "bg-status-disconnect text-white";
    default:
      return "bg-muted text-muted-foreground";
  }
};

const AgentStatusTable = ({ data }: AgentStatusTableProps) => {
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="font-semibold">Agent</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="font-semibold">Start Time</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, index) => (
            <TableRow key={index} className="hover:bg-muted/30 transition-colors">
              <TableCell className="font-medium">{row.agent}</TableCell>
              <TableCell>
                <Badge className={`${getStatusColor(row.status)} font-medium`}>
                  {row.status}
                </Badge>
              </TableCell>
              <TableCell className="font-mono text-sm">{row.time}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default AgentStatusTable;