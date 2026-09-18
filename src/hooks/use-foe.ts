"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { TASKS_KEY } from "./use-tasks";
import type {
  ApplicationDTO,
  EngineHealthDTO,
  FoeOpportunityDTO,
  FoePreferencesDTO,
  FoeSummaryDTO,
  OpeningSoonDTO,
  WatchlistItemDTO,
} from "@/lib/foe/types";

export const FOE_OPPS_KEY = ["foe", "opportunities"] as const;
export const FOE_OPENING_SOON_KEY = ["foe", "opening-soon"] as const;
export const FOE_WATCHLIST_KEY = ["foe", "watchlist"] as const;
export const FOE_PREFS_KEY = ["foe", "preferences"] as const;
export const FOE_APPLICATIONS_KEY = ["foe", "applications"] as const;
export const FOE_HEALTH_KEY = ["foe", "health"] as const;

interface OpportunitiesResponse {
  opportunities: FoeOpportunityDTO[];
  summary: FoeSummaryDTO;
}

export function useFoeOpportunities() {
  return useQuery({
    queryKey: FOE_OPPS_KEY,
    queryFn: () => api.get<OpportunitiesResponse>("/api/foe/opportunities"),
  });
}

export function useOpeningSoon() {
  return useQuery({
    queryKey: FOE_OPENING_SOON_KEY,
    queryFn: () => api.get<OpeningSoonDTO[]>("/api/foe/opening-soon"),
  });
}

export function useFoeWatchlist() {
  return useQuery({
    queryKey: FOE_WATCHLIST_KEY,
    queryFn: () => api.get<WatchlistItemDTO[]>("/api/foe/watchlist"),
  });
}

export function useFoePreferences() {
  return useQuery({
    queryKey: FOE_PREFS_KEY,
    queryFn: () => api.get<FoePreferencesDTO>("/api/foe/preferences"),
  });
}

export function useFoeApplications() {
  return useQuery({
    queryKey: FOE_APPLICATIONS_KEY,
    queryFn: () => api.get<ApplicationDTO[]>("/api/foe/applications"),
  });
}

export function useEngineHealth() {
  return useQuery({
    queryKey: FOE_HEALTH_KEY,
    queryFn: () => api.get<EngineHealthDTO>("/api/foe/health"),
    // The indicator should age visibly rather than sit on a stale timestamp.
    refetchInterval: 5 * 60_000,
  });
}

/** Watch / unwatch. Optimistic, because the button is a toggle the user will spam. */
export function useToggleWatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { opportunityId?: string; firmId?: string; programmeId?: string; watching: boolean }) =>
      api.post<{ watching: boolean }>("/api/foe/watchlist", input),
    onMutate: async (input) => {
      if (!input.opportunityId) return;
      await qc.cancelQueries({ queryKey: FOE_OPPS_KEY });
      const previous = qc.getQueryData<OpportunitiesResponse>(FOE_OPPS_KEY);
      qc.setQueryData<OpportunitiesResponse>(FOE_OPPS_KEY, (old) =>
        old
          ? {
              ...old,
              opportunities: old.opportunities.map((o) =>
                o.id === input.opportunityId ? { ...o, isWatched: input.watching } : o,
              ),
            }
          : old,
      );
      return { previous };
    },
    onError: (_err, _input, context) => {
      if (context?.previous) qc.setQueryData(FOE_OPPS_KEY, context.previous);
      toast.error("Couldn't update your watchlist.");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: FOE_OPPS_KEY });
      qc.invalidateQueries({ queryKey: FOE_OPENING_SOON_KEY });
      qc.invalidateQueries({ queryKey: FOE_WATCHLIST_KEY });
    },
  });
}

export function useUpdateWatchItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string; notifyWhatsApp?: boolean; notifyInApp?: boolean; notifyEmail?: boolean }) =>
      api.patch(`/api/foe/watchlist/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: FOE_WATCHLIST_KEY }),
    onError: () => toast.error("Couldn't update notifications for that item."),
  });
}

export function useRemoveWatchItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/foe/watchlist/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: FOE_WATCHLIST_KEY });
      qc.invalidateQueries({ queryKey: FOE_OPPS_KEY });
      qc.invalidateQueries({ queryKey: FOE_OPENING_SOON_KEY });
    },
    onError: () => toast.error("Couldn't stop watching that."),
  });
}

export function useUpdateFoePreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Record<string, unknown>) => api.patch<FoePreferencesDTO>("/api/foe/preferences", input),
    onSuccess: (data) => {
      qc.setQueryData(FOE_PREFS_KEY, data);
      // Eligibility and priority are computed from preferences, so the feed
      // has to be recomputed when they change.
      qc.invalidateQueries({ queryKey: FOE_OPPS_KEY });
    },
    onError: () => toast.error("Couldn't save your preferences."),
  });
}

export function useMarkApplied() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (opportunityId: string) => api.post<ApplicationDTO>("/api/foe/applications", { opportunityId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: FOE_OPPS_KEY });
      qc.invalidateQueries({ queryKey: FOE_APPLICATIONS_KEY });
      qc.invalidateQueries({ queryKey: TASKS_KEY });
      toast.success("Marked as applied — task added to your list.");
    },
    onError: () => toast.error("Couldn't mark that as applied."),
  });
}

export function useUpdateApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string; stage?: string; notes?: string | null }) =>
      api.patch<ApplicationDTO>(`/api/foe/applications/${id}`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: FOE_APPLICATIONS_KEY });
      qc.invalidateQueries({ queryKey: FOE_OPPS_KEY });
      qc.invalidateQueries({ queryKey: TASKS_KEY });
    },
    onError: (err: Error) => toast.error(err.message || "Couldn't update that application."),
  });
}
