import { useMedicalIntelligence } from "@/hooks/useMedicalIntelligence";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Sparkles, FlaskConical, Activity, ArrowRight, Network } from "lucide-react";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const URGENCY_DOT: Record<string, string> = {
  critical: "bg-destructive",
  high: "bg-orange-500",
  normal: "bg-primary",
  low: "bg-muted-foreground",
};

export function MedicalBrainWidget() {
  const { insights, isLoading } = useMedicalIntelligence("all", 3);

  return (
    <Link to="/research" className="block group">
      <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-background to-accent/5 hover:border-primary/40 hover:shadow-md transition-all">
        <div className="p-3 sm:p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-sm shadow-primary/20">
                <Brain className="h-4 w-4 text-primary-foreground" />
              </div>
              <div>
                <h3 className="text-sm font-semibold leading-tight">Bộ não Y tế</h3>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <FlaskConical className="h-2.5 w-2.5" />
                  <span>Nghiên cứu</span>
                  <Network className="h-2 w-2" />
                  <Activity className="h-2.5 w-2.5" />
                  <span>Dịch tễ</span>
                  <Sparkles className="h-2.5 w-2.5 text-primary" />
                  <span className="text-primary font-medium">AI</span>
                </div>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
          </div>

          {/* Insights preview */}
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : insights.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2 text-center">
              Đang tổng hợp tri thức từ PubMed × Tin dịch tễ…
            </p>
          ) : (
            <div className="space-y-1.5">
              {insights.map((ins) => (
                <div
                  key={ins.id}
                  className="flex items-start gap-2 p-2 rounded-lg bg-background/60 border border-border/50 hover:border-primary/30 transition-colors"
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full mt-1.5 flex-shrink-0",
                      URGENCY_DOT[ins.urgency_level],
                      ins.urgency_level === "critical" && "animate-pulse"
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium line-clamp-1">{ins.title_vi}</p>
                    <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                      {ins.community_summary}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 flex-shrink-0">
                    {Math.round(ins.confidence_score * 100)}%
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}
