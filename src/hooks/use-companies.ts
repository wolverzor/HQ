"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { CompanyDTO, CheckRunDTO } from "@/lib/types";
import { OPPS_KEY } from "./use-opportunities";
import { toast } from "sonner";

const COMPANIES_KEY = ["companies"] as const;

export function useCompanies() {
  return useQuery({
    queryKey: COMPANIES_KEY,
    queryFn: () => api.get<CompanyDTO[]>("/api/companies"),
  });
}

export function useCreateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; website?: string; careersUrl?: string; notes?: string }) =>
      api.post<CompanyDTO>("/api/companies", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: COMPANIES_KEY }),
    onError: () => toast.error("Couldn't add the company."),
  });
}

export function useUpdateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string } & Record<string, unknown>) =>
      api.patch<CompanyDTO>(`/api/companies/${id}`, input),
    onMutate: async ({ id, ...patch }) => {
      await qc.cancelQueries({ queryKey: COMPANIES_KEY });
      const previous = qc.getQueryData<CompanyDTO[]>(COMPANIES_KEY);
      qc.setQueryData<CompanyDTO[]>(COMPANIES_KEY, (old) =>
        old?.map((c) => (c.id === id ? { ...c, ...patch } as CompanyDTO : c)),
      );
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(COMPANIES_KEY, ctx.previous);
      toast.error("Couldn't update the company.");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: COMPANIES_KEY }),
  });
}

export function useDeleteCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/companies/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: COMPANIES_KEY }),
    onError: () => toast.error("Couldn't remove the company."),
  });
}

export function useCheckCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<CheckRunDTO>(`/api/companies/${id}/check`),
    onSuccess: (run) => {
      qc.invalidateQueries({ queryKey: COMPANIES_KEY });
      qc.invalidateQueries({ queryKey: OPPS_KEY });
      if (run.success) {
        toast.success(run.message);
      } else {
        toast.warning(run.message);
      }
    },
    onError: () => toast.error("Check failed unexpectedly."),
  });
}

export { COMPANIES_KEY };
