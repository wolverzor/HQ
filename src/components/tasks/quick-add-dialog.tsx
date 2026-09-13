"use client";

import { useQuickAdd } from "./quick-add-context";
import { TaskDialog } from "./task-dialog";

export function QuickAddDialog() {
  const { isOpen, close, defaults } = useQuickAdd();

  return (
    <TaskDialog
      open={isOpen}
      onOpenChange={(open) => !open && close()}
      defaultDeadline={defaults.deadline}
    />
  );
}
