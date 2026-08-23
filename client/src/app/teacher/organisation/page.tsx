"use client";

import React, { useEffect, useState } from "react";
import { Building2, Mail, Phone, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { getMyOrganisationService } from "./organisation.service";

interface Organisation {
  id: string;
  name: string;
  contactEmail?: string | null;
  phone?: string | null;
  address?: string | null;
  logoUrl?: string | null;
}

export default function TeacherOrganisationPage() {
  const [loading, setLoading] = useState(true);
  const [org, setOrg] = useState<Organisation | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await getMyOrganisationService();
        setOrg(res.data || null);
      } catch (err: any) {
        toast.error(err.response?.data?.message || "Failed to load organisation details");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="p-10 text-white text-center">Loading organisation details...</div>;

  if (!org) {
    return (
      <div className="p-10 text-white text-center">
        <p className="text-gray-400">No organisation is associated with your account yet.</p>
      </div>
    );
  }

  return (
    <div className="p-10 h-full overflow-y-auto custom-scrollbar">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white tracking-tight">Organisation</h2>
        <p className="text-gray-400 mt-1">Your organisation's public details.</p>
      </div>

      <div className="max-w-3xl">
        <Card className="bg-[#0f0f11] border-white/5 overflow-hidden">
          {/* Full-width org banner image */}
          <div className="w-full h-56 bg-[#0a0a0c] flex items-center justify-center overflow-hidden">
            {org.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={org.logoUrl} alt="organisation" className="w-full h-full object-contain p-4" />
            ) : (
              <div className="flex flex-col items-center text-gray-500">
                <Building2 className="h-16 w-16" />
                <p className="text-sm mt-3">No logo uploaded</p>
              </div>
            )}
          </div>

          <CardContent className="pt-6 flex flex-col items-center text-center space-y-6">
            <div>
              <h3 className="text-3xl font-bold text-white">{org.name}</h3>
            </div>

            <div className="w-full space-y-4">
              <div className="bg-[#0a0a0c] border border-white/5 rounded-xl p-4 flex items-center gap-4">
                <div className="h-10 w-10 bg-orange-600/20 rounded-lg flex items-center justify-center shrink-0">
                  <Mail className="h-5 w-5 text-orange-400" />
                </div>
                <div className="text-left min-w-0">
                  <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Email</p>
                  <p className="text-base text-gray-200 break-all">{org.contactEmail || "—"}</p>
                </div>
              </div>

              <div className="bg-[#0a0a0c] border border-white/5 rounded-xl p-4 flex items-center gap-4">
                <div className="h-10 w-10 bg-orange-600/20 rounded-lg flex items-center justify-center shrink-0">
                  <Phone className="h-5 w-5 text-orange-400" />
                </div>
                <div className="text-left min-w-0">
                  <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Contact Number</p>
                  <p className="text-base text-gray-200">{org.phone || "—"}</p>
                </div>
              </div>

              <div className="bg-[#0a0a0c] border border-white/5 rounded-xl p-4 flex items-center gap-4">
                <div className="h-10 w-10 bg-orange-600/20 rounded-lg flex items-center justify-center shrink-0">
                  <MapPin className="h-5 w-5 text-orange-400" />
                </div>
                <div className="text-left min-w-0">
                  <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Address</p>
                  <p className="text-base text-gray-200">{org.address || "—"}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}