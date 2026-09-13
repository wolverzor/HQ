import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 cursor-pointer active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover hover:shadow-md",
        secondary:
          "bg-surface-inset text-foreground hover:bg-surface-hover border border-border",
        ghost: "text-foreground hover:bg-surface-hover",
        outline: "border border-border bg-transparent text-foreground hover:bg-surface-hover",
        danger: "bg-danger text-white hover:opacity-90 shadow-sm",
        "danger-ghost": "text-danger hover:bg-danger-tint",
      },
      size: {
        sm: "h-8 px-3 text-[13px]",
        md: "h-9.5 px-4",
        lg: "h-11 px-5 text-[15px]",
        icon: "size-9",
        "icon-sm": "size-7",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />
  );
}

export { Button, buttonVariants };
