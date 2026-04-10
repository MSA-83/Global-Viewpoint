import { FC } from "react";
import { Badge } from "@/components/ui/badge";

export const SeverityBadge: FC<{ severity: string }> = ({ severity }) => {
  const styles: Record<string, string> = {
    critical: "bg-destructive text-destructive-foreground border-destructive",
    high: "bg-warning text-warning-foreground border-warning",
    medium: "bg-yellow-500 text-black border-yellow-500",
    low: "bg-primary text-primary-foreground border-primary",
    info: "bg-info text-info-foreground border-info",
  };

  return (
    <Badge variant="outline" className={`${styles[severity?.toLowerCase()] || styles.info} font-mono uppercase rounded-none`}>
      {severity}
    </Badge>
  );
};

export const StatusBadge: FC<{ status: string }> = ({ status }) => {
  return (
    <Badge variant="outline" className="border-primary/50 text-primary font-mono uppercase bg-primary/10 rounded-none">
      {status}
    </Badge>
  );
};
