"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, Mail, Phone, MapPin, KeyRound } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getMyOrganisationService } from "../student.service";

interface Organisation {
  id: string;
  name: string;
  contactEmail?: string | null;
  phone?: string | null;
  address?: string | null;
  logoUrl?: string | null;
}

export default function StudentOrganisationPage() {
  const [loading, setLoading] = useState(true);
  const [org, setOrg] = useState<Organisation | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await getMyOrganisationService();
        setOrg(res.data || null);
      } catch (err: any) {
        if (err.response?.status !== 404) {
          toast.error(err.response?.data?.message || "Failed to load organisation details");
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="p-10 text-white text-center">Loading organisation details...</div>;

  if (!org) {
    return (
      <div className="p-10 h-full flex items-center justify-center">
        <Card className="bg-[#0f0f11] border-white/5 max-w-md w-full">
          <CardContent className="pt-6 flex flex-col items-center text-center space-y-4">
            <div className="bg-orange-600/20 border border-orange-500/30 rounded-2xl p-3">
              <Building2 className="h-8 w-8 text-orange-400" />
            </div>
            <h3 className="text-xl font-bold text-white">You are not part of any organisation yet</h3>
            <p className="text-gray-400 text-sm">
              Join your organisation with the code shared by your manager to access organisation features.
            </p>
            <Link href="/student/join-organisation">
              <Button className="bg-orange-600 hover:bg-orange-500 text-white">
                <KeyRound className="h-4 w-4 mr-2" /> Join Organisation
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-10 h-full overflow-y-auto custom-scrollbar">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white tracking-tight">Organisation</h2>
        <p className="text-gray-400 mt-1">Your organisation public details.</p>
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
