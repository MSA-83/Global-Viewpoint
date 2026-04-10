import { useState } from "react";
import { useListIncidents } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SeverityBadge, StatusBadge } from "@/components/badges";
import { ShieldAlert, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function Incidents() {
  const [search, setSearch] = useState("");
  const { data: incidents, isLoading } = useListIncidents();
  
  const filteredIncidents = incidents?.filter(i => 
    i.title.toLowerCase().includes(search.toLowerCase()) || 
    i.region.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex justify-between items-center border-b border-primary/20 pb-2 shrink-0">
        <h1 className="text-2xl font-bold font-mono text-primary flex items-center gap-2">
          <ShieldAlert className="h-6 w-6" />
          INCIDENT MANAGEMENT
        </h1>
      </div>

      <div className="flex gap-4 items-center shrink-0">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search incidents..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-none border-primary/20 bg-background/50 font-mono"
          />
        </div>
      </div>

      <Card className="flex-1 rounded-none border-primary/20 bg-card/50 backdrop-blur-sm overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader className="bg-background/80 sticky top-0 z-10 backdrop-blur-sm">
              <TableRow className="border-primary/20 hover:bg-transparent">
                <TableHead className="font-mono text-primary font-bold">ID</TableHead>
                <TableHead className="font-mono text-primary font-bold">INCIDENT</TableHead>
                <TableHead className="font-mono text-primary font-bold">SEVERITY</TableHead>
                <TableHead className="font-mono text-primary font-bold">STATUS</TableHead>
                <TableHead className="font-mono text-primary font-bold">TYPE</TableHead>
                <TableHead className="font-mono text-primary font-bold">REGION</TableHead>
                <TableHead className="font-mono text-primary font-bold">STARTED</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="font-mono text-sm">
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground animate-pulse">
                    FETCHING RECORDS...
                  </TableCell>
                </TableRow>
              ) : filteredIncidents?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    NO RECORDS FOUND
                  </TableCell>
                </TableRow>
              ) : (
                filteredIncidents?.map((incident) => (
                  <TableRow key={incident.id} className="border-primary/10 hover:bg-primary/5 transition-colors">
                    <TableCell className="text-muted-foreground">INC-{incident.id.toString().padStart(4, '0')}</TableCell>
                    <TableCell className="font-bold">{incident.title}</TableCell>
                    <TableCell><SeverityBadge severity={incident.severity} /></TableCell>
                    <TableCell><StatusBadge status={incident.status} /></TableCell>
                    <TableCell className="uppercase">{incident.type.replace('_', ' ')}</TableCell>
                    <TableCell>{incident.region}</TableCell>
                    <TableCell className="text-muted-foreground">{new Date(incident.startedAt).toLocaleString()}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
