"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { OpportunityDTO } from "@/lib/types";
import { TASKS_KEY } from "./use-tasks";
import { toast } from "sonner";

const OPPS_KEY = ["opportunities"] as const;

export function useOpportunities() {
  return useQuery({
    queryKey: OPPS_KEY,
    queryFn: () => api.get<OpportunityDTO[]>("/api/opportunities"),
  });
}

export function useCreateOpportunity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Record<string, unknown>) =>
      api.post<OpportunityDTO>("/api/opportunities", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: OPPS_KEY }),
    onError: () => toast.error("Couldn't save the opportunity."),
  });
}

export function useUpdateOpportunity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string } & Record<string, unknown>) =>
      api.patch<OpportunityDTO>(`/api/opportunities/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: OPPS_KEY }),
    onError: () => toast.error("Couldn't update the opportunity."),
  });
}

export function useDeleteOpportunity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/opportunities/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: OPPS_KEY }),
    onError: () => toast.error("Couldn't delete the opportunity."),
  });
}

export function useStartApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post<{ opportunity: OpportunityDTO; task: unknown }>(`/api/opportunities/${id}/start-application`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: OPPS_KEY });
      qc.invalidateQueries({ queryKey: TASKS_KEY });
      toast.success("Application started — task added to your list.");
    },
    onError: () => toast.error("Couldn't start the application."),
  });
}

export { OPPS_KEY };
