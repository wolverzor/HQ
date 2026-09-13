"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { ProjectDTO } from "@/lib/types";

const PROJECTS_KEY = ["projects"] as const;

export function useProjects() {
  return useQuery({
    queryKey: PROJECTS_KEY,
    queryFn: () => api.get<ProjectDTO[]>("/api/projects"),
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; color?: string }) => api.post<ProjectDTO>("/api/projects", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: PROJECTS_KEY }),
  });
}
