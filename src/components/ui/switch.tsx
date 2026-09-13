"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "peer inline-flex h-[22px] w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent bg-surface-inset transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/30 data-[state=checked]:bg-primary",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="pointer-events-none block size-[18px] rounded-full bg-white shadow-sm ring-0 transition-transform data-[state=unchecked]:translate-x-0 data-[state=checked]:translate-x-[14px]" />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
