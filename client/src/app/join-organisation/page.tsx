"use client";

import JoinOrganisationView from "@/components/classroom/JoinOrganisationView";
import { ThemeSwitch } from "@/components/layout/ThemeSwitch";

export default function JoinOrganisationPage() {
  return (
    <>
      <ThemeSwitch className="fixed right-3 top-3 z-20" />
      <JoinOrganisationView />
    </>
  );
}