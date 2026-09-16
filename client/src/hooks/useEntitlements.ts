"use client";

import { useEffect, useState } from "react";
import api from "@/utils/axios";

export interface Entitlements {
  /** Whether this organisation's plan includes the realtime voice agent. */
  voiceAgent: boolean;
}

// Plan features change rarely and every screen with an agent asks for them, so
// the answer is fetched once per page load and shared, rather than re-requested
// by each component that needs it.
let cached: Entitlements | null = null;
let inFlight: Promise<Entitlements> | null = null;

async function fetchEntitlements(): Promise<Entitlements> {
  if (cached) return cached;
  if (!inFlight) {
    inFlight = api
      .get("/billing/entitlements/mine")
      .then((res) => {
        cached = res.data?.data ?? { voiceAgent: false };
        return cached!;
      })
      .catch(() => {
        // Deny by default: if we can't tell, don't offer a feature the plan
        // may not include — the chat agents cover the same flows anyway.
        return { voiceAgent: false };
      })
      .finally(() => {
        inFlight = null;
      });
  }
  return inFlight;
}

/**
 * What the current user's organisation is allowed to use.
 *
 * `loading` matters for voice: rendering a voice button before the answer
 * arrives would flash a control the teacher may not be entitled to, so
 * callers should wait rather than assume.
 */
export function useEntitlements(): { entitlements: Entitlements; loading: boolean } {
  const [entitlements, setEntitlements] = useState<Entitlements>(cached ?? { voiceAgent: false });
  const [loading, setLoading] = useState(cached === null);

  useEffect(() => {
    let active = true;
    if (cached) {
      setEntitlements(cached);
      setLoading(false);
      return;
    }
    fetchEntitlements().then((result) => {
      if (!active) return;
      setEntitlements(result);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  return { entitlements, loading };
}
