import { useState } from "react";
import { useListAssets } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Navigation, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function Assets() {
  const [search, setSearch] = useState("");
  const { data: assets, isLoading } = useListAssets();
  
  const filteredAssets = assets?.filter(a => 
    a.name.toLowerCase().includes(search.toLowerCase()) || 
    (a.designation && a.designation.toLowerCase().includes(search.toLowerCase()))
  );

  const getAffiliationColor = (aff: string) => {
    switch (aff) {
      case 'friendly': return 'text-info border-info bg-info/10';
      case 'hostile': return 'text-destructive border-destructive bg-destructive/10';
      case 'neutral': return 'text-success border-success bg-success/10';
      default: return 'text-muted-foreground border-muted-foreground bg-muted/10';
    }
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex justify-between items-center border-b border-primary/20 pb-2 shrink-0">
        <h1 className="text-2xl font-bold font-mono text-primary flex items-center gap-2">
          <Navigation className="h-6 w-6" />
          ASSET TRACKING
        </h1>
      </div>

      <div className="flex gap-4 items-center shrink-0">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search assets..." 
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
                <TableHead className="font-mono text-primary font-bold">NAME</TableHead>
                <TableHead className="font-mono text-primary font-bold">TYPE</TableHead>
                <TableHead className="font-mono text-primary font-bold">AFFILIATION</TableHead>
                <TableHead className="font-mono text-primary font-bold">STATUS</TableHead>
                <TableHead className="font-mono text-primary font-bold">POSITION</TableHead>
                <TableHead className="font-mono text-primary font-bold">LAST SEEN</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="font-mono text-sm">
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground animate-pulse">
                    FETCHING RECORDS...
                  </TableCell>
                </TableRow>
              ) : filteredAssets?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    NO RECORDS FOUND
                  </TableCell>
                </TableRow>
              ) : (
                filteredAssets?.map((asset) => (
                  <TableRow key={asset.id} className="border-primary/10 hover:bg-primary/5 transition-colors">
                    <TableCell className="text-muted-foreground">A-{asset.id.toString().padStart(4, '0')}</TableCell>
                    <TableCell>
                      <div className="font-bold">{asset.name}</div>
                      {asset.designation && <div className="text-xs text-muted-foreground">{asset.designation}</div>}
                    </TableCell>
                    <TableCell className="uppercase">{asset.type}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`rounded-none uppercase ${getAffiliationColor(asset.affiliation)}`}>
                        {asset.affiliation}
                      </Badge>
                    </TableCell>
                    <TableCell className="uppercase">{asset.status}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {asset.latitude.toFixed(4)}, {asset.longitude.toFixed(4)}
                      {asset.altitude && ` • ${asset.altitude}m`}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{new Date(asset.lastPositionAt).toLocaleTimeString()}</TableCell>
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
