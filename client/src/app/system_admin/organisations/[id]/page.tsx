"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, UserPlus, Trash2, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  getOrganisationsService,
  getOrganisationManagersService,
  assignManagerService,
  revokeManagerService,
} from "../organisation.service";

interface Organisation {
  id: string;
  name: string;
  createdAt: string;
}

interface Manager {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export default function OrganisationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const organisationId = params.id as string;

  const [organisation, setOrganisation] = useState<Organisation | null>(null);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [loading, setLoading] = useState(true);
  const [managerEmail, setManagerEmail] = useState("");
  const [assigning, setAssigning] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [orgsRes, managersRes] = await Promise.all([
        getOrganisationsService(),
        getOrganisationManagersService(organisationId),
      ]);
      const found = (orgsRes.data || []).find((o: Organisation) => o.id === organisationId);
      setOrganisation(found || null);
      setManagers(managersRes.data || []);
    } catch (err) {
      toast.error("Failed to load organisation");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (organisationId) loadAll();
  }, [organisationId]);

  const handleAssignManager = async () => {
    if (!managerEmail.includes("@")) {
      toast.error("Enter a valid email address");
      return;
    }
    setAssigning(true);
    try {
      await assignManagerService(organisationId, managerEmail.trim());
      toast.success(`${managerEmail} is now a manager of this organisation`);
      setManagerEmail("");
      loadAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to assign manager");
    } finally {
      setAssigning(false);
    }
  };

  const handleRevokeManager = async (userId: string, email: string) => {
    if (!confirm(`Revoke manager access for ${email}?`)) return;
    try {
      await revokeManagerService(organisationId, userId);
      toast.success("Manager revoked");
      loadAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to revoke manager");
    }
  };

  if (loading) return <div className="p-10 text-white text-center">Loading organisation...</div>;
  if (!organisation) return <div className="p-10 text-white text-center">Organisation not found</div>;

  return (
    <div className="p-10 h-full overflow-y-auto custom-scrollbar">
      <button
        onClick={() => router.push("/system_admin/organisations")}
        className="flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Organisations
      </button>

      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white tracking-tight">{organisation.name}</h2>
        <p className="text-gray-400 mt-1">Manage this organisation's owners (managers).</p>
      </div>

      <Card className="bg-[#111520] border-white/5 mb-6">
        <CardContent>
          <div className="flex items-center gap-2 text-gray-300 text-sm font-semibold mb-3">
            <UserPlus className="h-4 w-4" /> Assign a Manager
          </div>
          <p className="text-xs text-gray-500 mb-3">
            The user must already have an account. Assigning promotes their role to manager and links them to this organisation.
          </p>
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="manager@email.com"
              value={managerEmail}
              onChange={(e) => setManagerEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAssignManager()}
              className="flex-1 bg-[#09090b] border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-white/30 transition-all text-sm"
            />
            <Button className="bg-red-600 hover:bg-red-500 text-white shrink-0" onClick={handleAssignManager} disabled={assigning}>
              {assigning ? "Assigning..." : "Assign Manager"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <h3 className="text-lg font-semibold text-white mb-3">Managers ({managers.length})</h3>
      {managers.length === 0 ? (
        <Card className="bg-[#111520]/50 border-white/5 py-10 text-center">
          <CardContent>
            <Crown className="h-8 w-8 text-gray-500 mx-auto mb-3" />
            <p className="text-gray-400">No managers assigned yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {managers.map((m) => (
            <div key={m.id} className="flex items-center justify-between p-4 bg-[#111520] border border-white/5 rounded-xl">
              <div>
                <p className="text-white font-semibold text-sm">{m.name}</p>
                <p className="text-gray-500 text-xs">{m.email}</p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-400/10"
                onClick={() => handleRevokeManager(m.id, m.email)}
                title="Revoke manager"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
