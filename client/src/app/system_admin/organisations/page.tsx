"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Building2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { createOrganisationService, getOrganisationsService } from "./organisation.service";
import { formatDate } from "@/lib/date";

interface Organisation {
  id: string;
  name: string;
  createdAt: string;
}

export default function OrganisationsPage() {
  const router = useRouter();
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchOrganisations = async () => {
    setLoading(true);
    try {
      const res = await getOrganisationsService();
      setOrganisations(res.data || []);
    } catch (err) {
      toast.error("Failed to load organisations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganisations();
  }, []);

  const handleCreate = async () => {
    if (name.trim().length < 2) {
      toast.error("Organisation name must be at least 2 characters");
      return;
    }
    setCreating(true);
    try {
      await createOrganisationService({ name: name.trim() });
      toast.success("Organisation created");
      setDialogOpen(false);
      setName("");
      fetchOrganisations();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to create organisation");
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <div className="p-10 text-white text-center">Loading organisations...</div>;

  return (
    <div className="p-10 h-full overflow-y-auto custom-scrollbar">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Organisations</h2>
          <p className="text-gray-400 mt-1">Create organisations and assign managers to run them.</p>
        </div>
        <Button className="bg-red-600 hover:bg-red-500 text-white font-semibold" onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-5 w-5" />
          Create Organisation
        </Button>
      </div>

      {organisations.length === 0 ? (
        <Card className="bg-[#0f0f11]/50 border-white/5 py-16 text-center">
          <CardContent className="flex flex-col items-center">
            <div className="h-16 w-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
              <Building2 className="h-8 w-8 text-gray-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No organisations yet</h3>
            <p className="text-gray-400 max-w-sm mb-6">Create one to start onboarding a manager and their teachers.</p>
            <Button className="bg-red-600 hover:bg-red-500 text-white" onClick={() => setDialogOpen(true)}>
              Create Organisation
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {organisations.map((org) => (
            <div
              key={org.id}
              onClick={() => router.push(`/system_admin/organisations/${org.id}`)}
              className="flex items-center justify-between p-4 bg-[#0f0f11] border border-white/5 rounded-xl hover:bg-[#18181b] hover:border-white/10 transition-all gap-4 cursor-pointer"
            >
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="h-10 w-10 bg-red-600/20 text-red-400 rounded-lg flex items-center justify-center shrink-0 border border-red-500/20">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-[15px] font-bold text-white leading-tight truncate">{org.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Created {formatDate(org.createdAt)}
                  </p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-500 shrink-0" />
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-[#0f0f11] border border-white/10 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Create Organisation</DialogTitle>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <label className="text-xs font-medium text-gray-300">Organisation Name</label>
            <input
              autoFocus
              type="text"
              placeholder="e.g. ABC Coaching Institute"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              className="w-full bg-[#09090b] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-white/30 transition-all"
            />
          </div>

          <DialogFooter className="bg-transparent border-0 p-0 mt-2">
            <Button variant="ghost" className="text-gray-300 hover:text-white" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-red-600 hover:bg-red-500 text-white" onClick={handleCreate} disabled={creating}>
              {creating ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
