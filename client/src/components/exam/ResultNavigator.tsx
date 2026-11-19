"use client";

import React from "react";
import { List } from "lucide-react";
import { Button } from "@/components/ui/controls/button";
import { cn } from "@/lib/utils";

// The questions bar on a result page. On a phone it is a sidebar that slides in from the right (opened with the button in
// the top bar), so it does not push the question down the page. From md up it is the permanent column beside the question,
// which the "Hide Questions Bar" button in the top bar can collapse (`desktopVisible`).
export function ResultNavigator({
  open,
  onClose,
  desktopVisible,
  children,
}: {
  open: boolean;
  onClose: () => void;
  desktopVisible: boolean;
  children: React.ReactNode;
}) {
  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-black/60 md:hidden" onClick={onClose} />}
      <div
        className={cn(
          "fixed inset-y-0 right-0 z-40 flex w-72 max-w-[85vw] flex-col gap-4 border-l border-white/5 bg-[#0f0f11] p-3 transition-[transform,visibility] duration-200",
          "md:static md:z-auto md:col-span-1 md:min-h-0 md:w-auto md:max-w-none md:translate-x-0 md:border-0 md:bg-transparent md:p-0 md:visible",
          open ? "translate-x-0" : "invisible translate-x-full",
          !desktopVisible && "md:hidden"
        )}
      >
        {children}
      </div>
    </>
  );
}

/** The phone button that opens the sidebar. Wide screens have the Hide / Open Questions Bar button instead. */
export function OpenQuestionsButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      className="md:hidden bg-[#0f0f11] hover:bg-white/5 text-gray-300 hover:text-white border-white/10 text-xs h-8 px-3 rounded-xl flex w-full sm:w-auto items-center justify-center gap-1.5"
    >
      <List className="h-3.5 w-3.5 text-orange-400" />
      <span>Questions</span>
    </Button>
  );
}
