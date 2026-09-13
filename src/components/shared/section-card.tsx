import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface SectionCardProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  href?: string;
  hrefLabel?: string;
  children: React.ReactNode;
  className?: string;
}

export function SectionCard({ icon: Icon, title, subtitle, href, hrefLabel, children, className }: SectionCardProps) {
  return (
    <div className={cn("rounded-2xl border border-border bg-surface p-5", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-[10px] bg-surface-inset text-foreground">
            <Icon className="size-[17px]" strokeWidth={1.9} />
          </div>
          <div>
            <h2 className="text-[14.5px] font-semibold leading-tight text-foreground">{title}</h2>
            {subtitle && <p className="text-[12px] leading-tight text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        {href && (
          <Link
            href={href}
            className="flex items-center gap-0.5 text-[12.5px] font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            {hrefLabel ?? "View all"}
            <ChevronRight className="size-3.5" />
          </Link>
        )}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}
