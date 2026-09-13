"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { TaskDTO } from "@/lib/types";
import { toast } from "sonner";

const TASKS_KEY = ["tasks"] as const;

export function useTasks() {
  return useQuery({
    queryKey: TASKS_KEY,
    queryFn: () => api.get<TaskDTO[]>("/api/tasks"),
  });
}

export interface CreateTaskInput {
  title: string;
  description?: string | null;
  deadline?: string | null;
  priority?: "LOW" | "MEDIUM" | "HIGH";
  category?: "FINANCE_CAREER" | "UNIVERSITY" | "PERSONAL" | "PROJECTS";
  estimatedMinutes?: number | null;
  status?: "TODO" | "IN_PROGRESS" | "DONE";
  projectId?: string | null;
  opportunityId?: string | null;
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTaskInput) => api.post<TaskDTO>("/api/tasks", input),
    onSuccess: (task) => {
      qc.setQueryData<TaskDTO[]>(TASKS_KEY, (old) => (old ? [...old, task] : [task]));
    },
    onError: () => toast.error("Couldn't create the task. Try again."),
  });
}

export interface UpdateTaskInput extends Partial<CreateTaskInput> {
  id: string;
  order?: number;
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateTaskInput) => api.patch<TaskDTO>(`/api/tasks/${id}`, input),
    onMutate: async ({ id, ...patch }) => {
      await qc.cancelQueries({ queryKey: TASKS_KEY });
      const previous = qc.getQueryData<TaskDTO[]>(TASKS_KEY);
      qc.setQueryData<TaskDTO[]>(TASKS_KEY, (old) =>
        old?.map((t) => (t.id === id ? { ...t, ...patch } as TaskDTO : t)),
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(TASKS_KEY, ctx.previous);
      toast.error("Couldn't update the task.");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: TASKS_KEY }),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/tasks/${id}`),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: TASKS_KEY });
      const previous = qc.getQueryData<TaskDTO[]>(TASKS_KEY);
      qc.setQueryData<TaskDTO[]>(TASKS_KEY, (old) => old?.filter((t) => t.id !== id));
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(TASKS_KEY, ctx.previous);
      toast.error("Couldn't delete the task.");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: TASKS_KEY }),
  });
}

export function useReorderTasks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (items: { id: string; order: number }[]) =>
      api.post("/api/tasks/reorder", { items }),
    onMutate: async (items) => {
      await qc.cancelQueries({ queryKey: TASKS_KEY });
      const previous = qc.getQueryData<TaskDTO[]>(TASKS_KEY);
      const orderMap = new Map(items.map((i) => [i.id, i.order]));
      qc.setQueryData<TaskDTO[]>(TASKS_KEY, (old) =>
        old
          ?.map((t) => (orderMap.has(t.id) ? { ...t, order: orderMap.get(t.id)! } : t))
          .sort((a, b) => a.order - b.order),
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(TASKS_KEY, ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: TASKS_KEY }),
  });
}

export { TASKS_KEY };
