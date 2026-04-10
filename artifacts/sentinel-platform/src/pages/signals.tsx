import { useListSignals } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { SeverityBadge } from "@/components/badges";
import { Radio, Satellite, Globe, Rss, Monitor, User } from "lucide-react";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const sourceIcons: Record<string, React.ElementType> = {
  satellite: Satellite,
  social: Globe,
  radio: Rss,
  cyber: Monitor,
  humint: User,
};

const sourceColors: Record<string, string> = {
  satellite: "bg-blue-500/20 text-blue-400 border-blue-500/40",
  social: "bg-purple-500/20 text-purple-400 border-purple-500/40",
  radio: "bg-green-500/20 text-green-400 border-green-500/40",
  cyber: "bg-orange-500/20 text-orange-400 border-orange-500/40",
  humint: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40",
};

const confidenceColors: Record<string, string> = {
  confirmed: "bg-primary/20 text-primary border-primary/50",
  probable: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50",
  possible: "bg-muted/20 text-muted-foreground border-muted/50",
  unconfirmed: "bg-destructive/10 text-destructive/60 border-destructive/20",
};

export default function Signals() {
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [confidenceFilter, setConfidenceFilter] = useState<string>("all");

  const { data: signals, isLoading } = useListSignals({
    source: sourceFilter !== "all" ? (sourceFilter as any) : undefined,
    confidence: confidenceFilter !== "all" ? (confidenceFilter as any) : undefined,
  }, { query: { refetchInterval: 20000 } });

  return (
    <div className="space-y-6 h-full flex flex-col">
      <h1 className="text-2xl font-bold font-mono text-primary border-b border-primary/20 pb-2 shrink-0 flex items-center gap-2">
        <Radio className="h-6 w-6" />
        SIGNALS INTELLIGENCE (SIGINT/OSINT)
      </h1>

      <div className="flex gap-4 items-center shrink-0">
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-[180px] rounded-none border-primary/20 bg-background/50 font-mono">
            <SelectValue placeholder="Filter Source" />
          </SelectTrigger>
          <SelectContent className="rounded-none font-mono">
            <SelectItem value="all">ALL SOURCES</SelectItem>
            <SelectItem value="satellite">SATELLITE</SelectItem>
            <SelectItem value="social">SOCIAL/OSINT</SelectItem>
            <SelectItem value="radio">RADIO INTERCEPT</SelectItem>
            <SelectItem value="cyber">CYBER</SelectItem>
            <SelectItem value="humint">HUMINT</SelectItem>
          </SelectContent>
        </Select>
        <Select value={confidenceFilter} onValueChange={setConfidenceFilter}>
          <SelectTrigger className="w-[180px] rounded-none border-primary/20 bg-background/50 font-mono">
            <SelectValue placeholder="Confidence" />
          </SelectTrigger>
          <SelectContent className="rounded-none font-mono">
            <SelectItem value="all">ALL CONFIDENCE</SelectItem>
            <SelectItem value="confirmed">CONFIRMED</SelectItem>
            <SelectItem value="probable">PROBABLE</SelectItem>
            <SelectItem value="possible">POSSIBLE</SelectItem>
            <SelectItem value="unconfirmed">UNCONFIRMED</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto font-mono text-xs text-muted-foreground">
          {signals?.length || 0} INTERCEPTS
        </div>
      </div>

      <Card className="flex-1 rounded-none border-primary/20 bg-card/50 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader className="bg-background/80 sticky top-0 z-10 backdrop-blur-sm">
              <TableRow className="border-primary/20 hover:bg-transparent">
                <TableHead className="font-mono text-primary font-bold">ID</TableHead>
                <TableHead className="font-mono text-primary font-bold">SOURCE</TableHead>
                <TableHead className="font-mono text-primary font-bold">CONFIDENCE</TableHead>
                <TableHead className="font-mono text-primary font-bold">THREAT</TableHead>
                <TableHead className="font-mono text-primary font-bold">TITLE</TableHead>
                <TableHead className="font-mono text-primary font-bold">REGION</TableHead>
                <TableHead className="font-mono text-primary font-bold">TAGS</TableHead>
                <TableHead className="font-mono text-primary font-bold">COLLECTED</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="font-mono text-sm">
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground animate-pulse">
                    DECRYPTING INTERCEPTS...
                  </TableCell>
                </TableRow>
              ) : signals?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    NO SIGNALS IN QUEUE
                  </TableCell>
                </TableRow>
              ) : (
                signals?.map((sig) => {
                  const SrcIcon = sourceIcons[sig.source] || Radio;
                  return (
                    <TableRow key={sig.id} className="border-primary/10 hover:bg-primary/5">
                      <TableCell className="text-muted-foreground">S-{sig.id.toString().padStart(4, "0")}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`${sourceColors[sig.source] || ""} rounded-none font-mono uppercase flex items-center gap-1 w-fit`}>
                          <SrcIcon className="h-3 w-3" />
                          {sig.source}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`${confidenceColors[sig.confidence] || ""} rounded-none font-mono uppercase`}>
                          {sig.confidence}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {sig.threatLevel !== "none" ? <SeverityBadge severity={sig.threatLevel} /> : (
                          <span className="text-muted-foreground text-xs">NONE</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="font-bold">{sig.title}</div>
                        {sig.summary && <div className="text-xs text-muted-foreground mt-0.5 truncate">{sig.summary}</div>}
                      </TableCell>
                      <TableCell>{sig.region}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {(sig.tags || []).slice(0, 2).map((tag, i) => (
                            <span key={i} className="text-[10px] bg-primary/10 text-primary px-1 py-0.5 border border-primary/20">{tag}</span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">{new Date(sig.collectedAt).toLocaleString()}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
