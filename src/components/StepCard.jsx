import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "cn";

// Карточка одного шага: номер слева, заголовок и подпись сверху.
export function StepCard({ step, title, description, action, children, className }) {
  return (
    <Card className={cn("gap-0", className)}>
      <CardHeader className="border-b pb-4">
        <div className="flex flex-wrap items-start gap-3">
          <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
            {step}
          </span>
          <div className="min-w-48 flex-1">
            <CardTitle>{title}</CardTitle>
            {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
          </div>
          {action && <div className="w-full sm:w-auto [&>button]:w-full sm:[&>button]:w-auto">{action}</div>}
        </div>
      </CardHeader>
      <CardContent className="pt-4">{children}</CardContent>
    </Card>
  );
}
