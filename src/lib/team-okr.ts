import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export type OkrRate = {
  numerator: number;
  denominator: number;
  percent: number | null;
  target: number;
};
export type TeamOkrSnapshot = {
  version: 1;
  observedAt: string;
  signupFrom: string;
  signupTo: string;
  totalUsers: number;
  matureUsers: number;
  pendingUsers: number;
  noSaveUsers: number | null;
  firstSave: {
    meanMinutes: number | null;
    medianMinutes: number | null;
    sampleSize: number;
    targetMinutes: number | null;
  };
  save: OkrRate;
  reportedUse: OkrRate;
  sevenDaySave: OkrRate;
  quality: {
    complete: boolean;
    missingSignupSessions: number;
    missingOutcomes: number;
    missingActionSessions: number;
    excludedSimulations: number;
    excludedDuplicates: number;
    loggedEvents: number;
    lastEventAt: string | null;
  };
};

export function signupPeriod(from: string, through: string) {
  const start = new Date(`${from}T00:00:00.000Z`);
  const inclusiveEnd = new Date(`${through}T00:00:00.000Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(from) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(through) ||
    !Number.isFinite(start.getTime()) ||
    !Number.isFinite(inclusiveEnd.getTime()) ||
    start.toISOString().slice(0, 10) !== from ||
    inclusiveEnd.toISOString().slice(0, 10) !== through
  ) {
    throw new Error("Choose valid signup dates.");
  }
  const end = new Date(inclusiveEnd.getTime() + 86400000);
  if (end <= start || end.getTime() - start.getTime() > 366 * 86400000) {
    throw new Error("Choose a signup period of 1–366 days.");
  }
  return { from: start.toISOString(), to: end.toISOString() };
}

export async function fetchTeamOkrSnapshot(
  from: string,
  through: string,
): Promise<TeamOkrSnapshot> {
  const period = signupPeriod(from, through);
  const { data, error } = await supabase.rpc("team_okr_snapshot", {
    p_signup_from: period.from,
    p_signup_to: period.to,
  });
  if (error) {
    if (error.code === "42501" || error.code === "PGRST301")
      throw new Error("Sign in with an approved team account to view these metrics.");
    if (error.code === "PGRST202" || error.code === "42883")
      throw new Error(
        "The OKR database update has not been applied yet. Ask the project administrator to apply the dashboard migration.",
      );
    throw new Error("Team metrics could not load. Check the connection and try again.");
  }
  if (
    !data ||
    data.version !== 1 ||
    !data.quality ||
    !data.firstSave ||
    !data.save ||
    !data.reportedUse ||
    !data.sevenDaySave
  ) {
    throw new Error(
      "The metrics response is incomplete. Refresh after checking the database update.",
    );
  }
  return data as TeamOkrSnapshot;
}

export function useTeamOkrSnapshot(
  from: string,
  through: string,
  user: string | null,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ["team_okr_snapshot", user, from, through],
    queryFn: () => fetchTeamOkrSnapshot(from, through),
    enabled: enabled && !!user,
    staleTime: 30_000,
    retry: false,
    refetchOnWindowFocus: true,
    gcTime: 0,
  });
}
