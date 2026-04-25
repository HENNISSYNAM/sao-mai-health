import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { METRIC_TYPES } from "@/lib/metricTypes";

/**
 * Global legend explaining the three metric types.
 * Available on every screen via the floating (i) button or as inline trigger.
 */
interface MetricLegendProps {
  variant?: "floating" | "inline" | "icon";
  className?: string;
}

export function MetricLegend({ variant = "icon", className }: MetricLegendProps) {
  const { i18n } = useTranslation();
  const isVi = i18n.language === "vi";
  const [open, setOpen] = useState(false);

  const trigger =
    variant === "floating" ? (
      <Button
        variant="outline"
        size="icon"
        className={cn(
          "fixed bottom-24 right-4 z-40 h-10 w-10 rounded-full shadow-lg bg-card/95 backdrop-blur-md md:bottom-6",
          className,
        )}
        aria-label={isVi ? "Chú giải" : "Legend"}
      >
        <Info className="h-4 w-4" />
      </Button>
    ) : variant === "inline" ? (
      <Button variant="ghost" size="sm" className={cn("h-7 gap-1 text-xs text-muted-foreground", className)}>
        <Info className="h-3.5 w-3.5" />
        {isVi ? "Chú giải dữ liệu" : "Data legend"}
      </Button>
    ) : (
      <button
        type="button"
        aria-label={isVi ? "Chú giải" : "Legend"}
        className={cn(
          "inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground/70 hover:text-foreground transition-colors",
          className,
        )}
      >
        <Info className="h-3.5 w-3.5" />
      </button>
    );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Info className="h-4 w-4 text-primary" />
            {isVi ? "Chú giải các loại dữ liệu" : "Data type legend"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            {isVi
              ? "Mỗi chỉ số trên giao diện thuộc một trong 3 loại sau. Đừng nhầm lẫn giữa chúng."
              : "Every metric in this app belongs to one of these 3 types. Do not confuse them."}
          </p>
          {Object.values(METRIC_TYPES).map((m) => {
            const Icon = m.icon;
            return (
              <div
                key={m.id}
                className={cn(
                  "rounded-xl border p-3 space-y-1.5",
                  m.borderClass,
                  m.bgClass,
                )}
              >
                <div className="flex items-center gap-2">
                  <div className={cn("p-1.5 rounded-lg bg-background/60", m.textClass)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className={cn("text-sm font-semibold", m.textClass)}>
                      {isVi ? m.labelVi : m.labelEn}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {isVi ? `Đơn vị: ${m.unitVi}` : `Unit: ${m.unitEn}`} ·{" "}
                      {isVi ? `Nguồn: ${m.defaultSourceVi}` : `Source: ${m.defaultSourceEn}`}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-foreground/80 leading-relaxed">
                  {isVi ? m.descriptionVi : m.descriptionEn}
                </p>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
