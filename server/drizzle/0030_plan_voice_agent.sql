-- Voice agent as a plan entitlement.
--
-- Hand-written for the same reason as 0029: the drizzle snapshots are behind,
-- so `drizzle-kit generate` stops to ask about uncaptured tables. Idempotent.

-- Defaults to false everywhere, so every EXISTING plan and subscription stays
-- voice-free and keeps using the chat agents. Only the new plan opts in.
ALTER TABLE "plans"
    ADD COLUMN IF NOT EXISTS "has_voice_agent" boolean DEFAULT false NOT NULL;

ALTER TABLE "organisation_subscriptions"
    ADD COLUMN IF NOT EXISTS "has_voice_agent" boolean DEFAULT false NOT NULL;
