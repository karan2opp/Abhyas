"use client";

import React, { useEffect, useRef, useState } from "react";
import { Building2, Save, Loader2, Mail, Phone, MapPin, ImagePlus, UploadCloud, X, KeyRound, Copy, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getMyOrganisationService, updateMyOrganisationService, uploadMyOrganisationLogoService, getMyOrganisationJoinCodeService, regenerateMyOrganisationJoinCodeService } from "../billing.service";

export default function ManagerOrganisationPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    contactEmail: "",
    phone: "",
    address: "",
    logoUrl: "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState<string | null>(null);
  const [loadingJoinCode, setLoadingJoinCode] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const loadJoinCode = async () => {
    setLoadingJoinCode(true);
    try {
      const res = await getMyOrganisationJoinCodeService();
      setJoinCode(res.data?.joinCode || null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to load join code");
    } finally {
      setLoadingJoinCode(false);
    }
  };

  const handleCopyJoinCode = async () => {
    if (!joinCode) return;
    try {
      await navigator.clipboard.writeText(joinCode);
      toast.success("Join code copied");
    } catch {
      toast.error("Could not copy join code");
    }
  };

  const handleRegenerate = async () => {
    if (!confirm("Regenerate the join code? The previous code will stop working.")) return;
    setRegenerating(true);
    try {
      const res = await regenerateMyOrganisationJoinCodeService();
      setJoinCode(res.data?.joinCode || null);
      toast.success("Join code regenerated");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to regenerate join code");
    } finally {
      setRegenerating(false);
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await getMyOrganisationService();
      const org = res.data || {};
      setForm({
        name: org.name || "",
        contactEmail: org.contactEmail || "",
        phone: org.phone || "",
        address: org.address || "",
        logoUrl: org.logoUrl || "",
      });
      setLogoPreview(org.logoUrl || null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to load organisation details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    loadJoinCode();
  }, []);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleUploadLogo = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      toast.error("Select a logo image first");
      return;
    }
    setUploading(true);
    try {
      const res = await uploadMyOrganisationLogoService(file);
      const org = res.data || {};
      setForm(f => ({ ...f, logoUrl: org.logoUrl || "" }));
      setLogoPreview(org.logoUrl || null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      toast.success("Organisation logo uploaded");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to upload logo");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim() || form.name.trim().length < 2) {
      toast.error("Organisation name must be at least 2 characters");
      return;
    }
    setSaving(true);
    try {
      await updateMyOrganisationService({
        name: form.name.trim(),
        contactEmail: form.contactEmail.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
      });
      toast.success("Organisation details updated");
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update organisation");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-10 text-white text-center">Loading organisation details...</div>;

  return (
    <div className="p-10 h-full overflow-y-auto custom-scrollbar">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white tracking-tight">Organisation</h2>
        <p className="text-gray-400 mt-1">Manage your organisation's public details and branding.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="bg-[#0f0f11] border-white/5 lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Building2 className="h-5 w-5 text-orange-400" /> Organisation Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">Organisation Name *</label>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full bg-[#09090b] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-white/30 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-orange-400" /> Contact Email
              </label>
              <input
                type="email"
                value={form.contactEmail}
                onChange={e => setForm(f => ({ ...f, contactEmail: e.target.value }))}
                className="w-full bg-[#09090b] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-white/30 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-orange-400" /> Phone
              </label>
              <input
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full bg-[#09090b] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-white/30 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-orange-400" /> Address
              </label>
              <textarea
                rows={3}
                value={form.address}
                onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                className="w-full bg-[#09090b] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-white/30 transition-all resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="ghost" className="text-gray-300 hover:text-white" onClick={load}>
                Cancel
              </Button>
              <Button className="bg-orange-600 hover:bg-orange-500 text-white" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save Details
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Logo / Preview */}
        <Card className="bg-[#0f0f11] border-white/5 h-fit">
          <CardHeader>
            <CardTitle className="text-white">Organisation Logo</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center text-center space-y-4">
            <div className="h-36 w-full bg-[#0a0a0c] rounded-xl border border-white/5 flex items-center justify-center p-4 overflow-hidden">
              {logoPreview ? (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logoPreview} alt="logo" className="h-28 w-28 object-contain" />
                  {!form.logoUrl && (
                    <button
                      onClick={() => { setLogoPreview(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                      className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 shadow"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center text-gray-500">
                  <Building2 className="h-10 w-10" />
                  <p className="text-xs mt-2">No logo uploaded</p>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleLogoChange}
              className="hidden"
            />
            <div className="w-full space-y-2">
              <Button variant="outline" className="w-full border-white/10 text-white" onClick={() => fileInputRef.current?.click()}>
                <ImagePlus className="h-4 w-4 mr-2 text-orange-400" /> Choose Image
              </Button>
              <Button className="w-full bg-orange-600 hover:bg-orange-500 text-white" onClick={handleUploadLogo} disabled={uploading || !fileInputRef.current?.files?.[0]}>
                {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UploadCloud className="h-4 w-4 mr-2" />}
                {uploading ? "Uploading..." : "Upload Logo"}
              </Button>
              {form.logoUrl && <p className="text-[10px] text-emerald-400">Logo uploaded successfully</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Join Code */}
      <Card className="bg-[#0f0f11] border-white/5 mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <KeyRound className="h-5 w-5 text-orange-400" /> Organisation Join Code
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-gray-500">
            Share this code with students and teachers so they can join your organisation. Each code is unique to your organisation.
          </p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex-1 bg-[#09090b] border border-white/10 rounded-xl px-4 py-3">
              {loadingJoinCode ? (
                <span className="text-gray-500 text-sm">Loading...</span>
              ) : (
                <span className="text-white font-mono text-xl font-bold tracking-[0.35em]">{joinCode || "No code yet"}</span>
              )}
            </div>
            <div className="flex gap-2 shrink-0">
              <Button
                variant="outline"
                className="border-white/10 text-white"
                onClick={handleCopyJoinCode}
                disabled={!joinCode || loadingJoinCode}
              >
                <Copy className="h-4 w-4 mr-2 text-orange-400" /> Copy
              </Button>
              <Button
                variant="outline"
                className="border-white/10 text-white"
                onClick={handleRegenerate}
                disabled={regenerating}
              >
                {regenerating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2 text-orange-400" />}
                Regenerate
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

