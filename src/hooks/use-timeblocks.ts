"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { TimeBlockDTO } from "@/lib/types";
import { TASKS_KEY } from "./use-tasks";
import { toast } from "sonner";

const BLOCKS_KEY = ["timeblocks"] as const;

export function useTimeBlocks() {
  return useQuery({
    queryKey: BLOCKS_KEY,
    queryFn: () => api.get<TimeBlockDTO[]>("/api/timeblocks"),
  });
}

export interface CreateTimeBlockInput {
  title: string;
  start: string;
  end: string;
  taskId?: string | null;
  color?: string;
}

export function useCreateTimeBlock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTimeBlockInput) => api.post<TimeBlockDTO>("/api/timeblocks", input),
    onSuccess: (block) => {
      qc.setQueryData<TimeBlockDTO[]>(BLOCKS_KEY, (old) => (old ? [...old, block] : [block]));
      if (block.taskId) qc.invalidateQueries({ queryKey: TASKS_KEY });
    },
    onError: () => toast.error("Couldn't create the time block."),
  });
}

export interface UpdateTimeBlockInput {
  id: string;
  title?: string;
  start?: string;
  end?: string;
  taskId?: string | null;
  color?: string;
  notes?: string | null;
  completed?: boolean;
}

export function useUpdateTimeBlock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateTimeBlockInput) =>
      api.patch<TimeBlockDTO>(`/api/timeblocks/${id}`, input),
    onMutate: async ({ id, ...patch }) => {
      await qc.cancelQueries({ queryKey: BLOCKS_KEY });
      const previous = qc.getQueryData<TimeBlockDTO[]>(BLOCKS_KEY);
      qc.setQueryData<TimeBlockDTO[]>(BLOCKS_KEY, (old) =>
        old?.map((b) => (b.id === id ? { ...b, ...patch } as TimeBlockDTO : b)),
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(BLOCKS_KEY, ctx.previous);
      toast.error("Couldn't update the time block.");
    },
    onSettled: (block) => {
      qc.invalidateQueries({ queryKey: BLOCKS_KEY });
      if (block?.taskId) qc.invalidateQueries({ queryKey: TASKS_KEY });
    },
  });
}

export function useDeleteTimeBlock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/timeblocks/${id}`),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: BLOCKS_KEY });
      const previous = qc.getQueryData<TimeBlockDTO[]>(BLOCKS_KEY);
      qc.setQueryData<TimeBlockDTO[]>(BLOCKS_KEY, (old) => old?.filter((b) => b.id !== id));
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(BLOCKS_KEY, ctx.previous);
      toast.error("Couldn't delete the time block.");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: BLOCKS_KEY }),
  });
}

export { BLOCKS_KEY };
