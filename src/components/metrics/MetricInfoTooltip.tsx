import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Small (i) icon with a tooltip explaining what a metric means and how it's calculated.
 */
interface MetricInfoTooltipProps {
  content: string;
  className?: string;
  size?: "xs" | "sm";
}

export function MetricInfoTooltip({ content, className, size = "xs" }: MetricInfoTooltipProps) {
  const sizeClass = size === "xs" ? "h-3 w-3" : "h-3.5 w-3.5";
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={cn(
              "inline-flex items-center justify-center rounded-full text-muted-foreground/60 hover:text-foreground transition-colors",
              className,
            )}
            aria-label="More info"
            onClick={(e) => e.preventDefault()}
          >
            <Info className={sizeClass} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[260px] text-xs leading-relaxed">
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
