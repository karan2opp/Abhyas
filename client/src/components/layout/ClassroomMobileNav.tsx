"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Menu, X } from "lucide-react";
import { ThemeSwitch } from "@/components/layout/ThemeSwitch";
import { cn } from "@/lib/utils";

export type ClassroomNavItem = { href: string; label: string; icon: React.ElementType };

// A classroom's sections on a phone: a bar with a menu button, and a sidebar that slides in from the left. It takes the
// place of a row of tabs that had to be scrolled sideways. Wide screens keep their own permanent sidebar.
export function ClassroomMobileNav({
  classroomName,
  backHref,
  items,
}: {
  classroomName: string;
  backHref: string;
  items: ClassroomNavItem[];
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Choosing a section changes the page, so the sidebar closes.
  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="md:hidden shrink-0 border-b border-white/10 bg-black">
      {/* Same as the main header on phones: the title on the left, the theme switch and the menu button on the right. */}
      <div className="flex items-center justify-between gap-2 p-4">
        <h2 className="flex-1 min-w-0 text-lg font-bold text-white tracking-tight truncate" title={classroomName}>
          {classroomName}
        </h2>
        <div className="flex items-center gap-1 shrink-0">
          <ThemeSwitch />
          <button onClick={() => setOpen(true)} className="p-2 -mr-2 text-gray-400 hover:text-white" aria-label="Open classroom menu">
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </div>

      {open && <div className="fixed inset-0 z-40 bg-black/60" onClick={() => setOpen(false)} />}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] flex flex-col border-r border-white/10 bg-black transition-[transform,visibility] duration-200",
          open ? "translate-x-0" : "-translate-x-full invisible"
        )}
      >
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center justify-between gap-2 mb-3">
            <Link href={backHref} className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm transition-colors">
              <ArrowLeft className="h-4 w-4 shrink-0" /> <span>All Classrooms</span>
            </Link>
            <button onClick={() => setOpen(false)} className="p-1.5 -mr-1.5 rounded-md text-gray-400 hover:text-white hover:bg-white/10" aria-label="Close classroom menu">
              <X className="h-5 w-5" />
            </button>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight break-words">{classroomName}</h2>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto custom-scrollbar">
          {items.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive ? "bg-orange-600 text-white font-semibold shadow-md shadow-orange-950/40" : "text-white/70 hover:text-white hover:bg-zinc-900/80"
                )}
              >
                <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-white" : "text-white/70")} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </div>
  );
}
