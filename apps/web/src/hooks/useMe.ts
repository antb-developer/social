import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/apiClient";

export type Me = { id: string; name: string | null; phone: string };

export function useMe() {
  return useQuery({ queryKey: ["me"], queryFn: () => apiFetch<Me>("/api/me") });
}
