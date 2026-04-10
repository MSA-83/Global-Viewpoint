import { useState } from "react";
import { useListThreats, useCreateThreat, useUpdateThreat, useDeleteThreat } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SeverityBadge, StatusBadge } from "@/components/badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { getListThreatsQueryKey } from "@workspace/api-client-react";
import { AlertTriangle, Plus, Search, Filter, Trash2 } from "lucide-react";
import { ThreatSeverity, ThreatCategory, ThreatStatus, Threat, CreateThreatBody, UpdateThreatBody } from "@workspace/api-client-react";
import { Label } from "@/components/ui/label";

export default function Threats() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  
  const { data: threats, isLoading } = useListThreats({ 
    severity: severityFilter !== "all" ? (severityFilter as ThreatSeverity) : undefined 
  });
  
  const createThreatMutation = useCreateThreat();
  const updateThreatMutation = useUpdateThreat();
  const deleteThreatMutation = useDeleteThreat();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingThreat, setEditingThreat] = useState<Threat | null>(null);

  const handleDelete = (id: number) => {
    if (confirm("Confirm deletion of threat record?")) {
      deleteThreatMutation.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListThreatsQueryKey() });
        }
      });
    }
  };

  const filteredThreats = threats?.filter(t => 
    t.title.toLowerCase().includes(search.toLowerCase()) || 
    t.region.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex justify-between items-center border-b border-primary/20 pb-2 shrink-0">
        <h1 className="text-2xl font-bold font-mono text-primary flex items-center gap-2">
          <AlertTriangle className="h-6 w-6" />
          THREAT INTELLIGENCE
        </h1>
        <Sheet open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="border-primary text-primary hover:bg-primary/20 font-mono rounded-none">
              <Plus className="h-4 w-4 mr-2" />
              LOG NEW THREAT
            </Button>
          </SheetTrigger>
          <SheetContent className="bg-card border-l border-primary/20 sm:max-w-md font-mono text-foreground">
            <SheetHeader>
              <SheetTitle className="text-primary font-mono font-bold">LOG NEW THREAT RECORD</SheetTitle>
            </SheetHeader>
            <div className="py-6 space-y-4">
              {/* Simplified form for brevity */}
              <div className="space-y-2">
                <Label>TITLE</Label>
                <Input id="title" placeholder="Operation name / Identifier" className="rounded-none border-border bg-background" />
              </div>
              <div className="space-y-2">
                <Label>SEVERITY</Label>
                <Select defaultValue="medium">
                  <SelectTrigger className="rounded-none border-border bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">CRITICAL</SelectItem>
                    <SelectItem value="high">HIGH</SelectItem>
                    <SelectItem value="medium">MEDIUM</SelectItem>
                    <SelectItem value="low">LOW</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>CATEGORY</Label>
                <Select defaultValue="military">
                  <SelectTrigger className="rounded-none border-border bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="military">MILITARY</SelectItem>
                    <SelectItem value="cyber">CYBER</SelectItem>
                    <SelectItem value="terrorism">TERRORISM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>LATITUDE</Label>
                  <Input type="number" placeholder="0.0" className="rounded-none border-border bg-background" />
                </div>
                <div className="space-y-2">
                  <Label>LONGITUDE</Label>
                  <Input type="number" placeholder="0.0" className="rounded-none border-border bg-background" />
                </div>
              </div>
            </div>
            <SheetFooter>
              <SheetClose asChild>
                <Button variant="outline" className="rounded-none border-primary text-primary hover:bg-primary/20">CANCEL</Button>
              </SheetClose>
              <Button className="rounded-none bg-primary text-primary-foreground hover:bg-primary/80">SUBMIT RECORD</Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex gap-4 items-center shrink-0">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search designations or regions..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-none border-primary/20 bg-background/50 font-mono"
          />
        </div>
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-[180px] rounded-none border-primary/20 bg-background/50 font-mono">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter Severity" />
          </SelectTrigger>
          <SelectContent className="rounded-none border-primary/20 font-mono">
            <SelectItem value="all">ALL SEVERITIES</SelectItem>
            <SelectItem value="critical">CRITICAL</SelectItem>
            <SelectItem value="high">HIGH</SelectItem>
            <SelectItem value="medium">MEDIUM</SelectItem>
            <SelectItem value="low">LOW</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="flex-1 rounded-none border-primary/20 bg-card/50 backdrop-blur-sm overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader className="bg-background/80 sticky top-0 z-10 backdrop-blur-sm">
              <TableRow className="border-primary/20 hover:bg-transparent">
                <TableHead className="font-mono text-primary font-bold">ID</TableHead>
                <TableHead className="font-mono text-primary font-bold">DESIGNATION</TableHead>
                <TableHead className="font-mono text-primary font-bold">SEVERITY</TableHead>
                <TableHead className="font-mono text-primary font-bold">STATUS</TableHead>
                <TableHead className="font-mono text-primary font-bold">CATEGORY</TableHead>
                <TableHead className="font-mono text-primary font-bold">REGION</TableHead>
                <TableHead className="font-mono text-primary font-bold">CONFIDENCE</TableHead>
                <TableHead className="font-mono text-primary font-bold text-right">ACTIONS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="font-mono text-sm">
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground animate-pulse">
                    FETCHING RECORDS...
                  </TableCell>
                </TableRow>
              ) : filteredThreats?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    NO RECORDS FOUND
                  </TableCell>
                </TableRow>
              ) : (
                filteredThreats?.map((threat) => (
                  <TableRow key={threat.id} className="border-primary/10 hover:bg-primary/5 transition-colors">
                    <TableCell className="text-muted-foreground">T-{threat.id.toString().padStart(4, '0')}</TableCell>
                    <TableCell className="font-bold">{threat.title}</TableCell>
                    <TableCell><SeverityBadge severity={threat.severity} /></TableCell>
                    <TableCell><StatusBadge status={threat.status} /></TableCell>
                    <TableCell className="uppercase">{threat.category}</TableCell>
                    <TableCell>{threat.region}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-background border border-border">
                          <div 
                            className="h-full bg-primary" 
                            style={{ width: `${threat.confidence}%` }}
                          />
                        </div>
                        <span className="text-xs">{threat.confidence}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDelete(threat.id)}
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-none"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
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
