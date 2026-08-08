"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Award, AlertCircle, CheckCircle, Clock } from "lucide-react";

type CertificateStats = {
  totalIssued: number;
  active: number;
  revoked: number;
  expired: number;
  pending: number;
  recentIssued: number;
  recentRevoked: number;
};

type RecentCertificate = {
  id: string;
  certificateNumber: string;
  agentId: string;
  courseId: string;
  status: string;
  issuedAt: string;
  expiresAt?: string;
};

export function CertificateMonitoringDashboard() {
  const [stats, setStats] = useState<CertificateStats | null>(null);
  const [recentCertificates, setRecentCertificates] = useState<RecentCertificate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMonitoringData();
  }, []);

  const loadMonitoringData = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/v1/admin/academy/certificates/monitoring");
      if (response.ok) {
        const data = await response.json();
        setStats(data.data.stats);
        setRecentCertificates(data.data.recentCertificates || []);
      }
    } catch (error) {
      console.error("Failed to load monitoring data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-slate-400">Loading certificate monitoring data...</div>;
  }

  const activePercentage = stats && stats.totalIssued > 0 ? ((stats.active / stats.totalIssued) * 100).toFixed(1) : "0.0";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">Certificate Monitoring</h3>
          <p className="text-sm text-slate-400">Real-time certificate generation and status tracking</p>
        </div>
        <Button className="w-full sm:w-auto" onClick={loadMonitoringData}>Refresh</Button>
      </div>

      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Award className="h-5 w-5 text-emerald-400" />
              <span className="text-sm text-slate-400">Total Issued</span>
            </div>
            <p className="text-2xl font-bold text-white">{stats.totalIssued}</p>
            <p className="text-xs text-slate-500 mt-1">+{stats.recentIssued} this week</p>
          </div>

          <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-5 w-5 text-emerald-400" />
              <span className="text-sm text-slate-400">Active</span>
            </div>
            <p className="text-2xl font-bold text-white">{stats.active}</p>
            <p className="text-xs text-slate-500 mt-1">{activePercentage}% of total</p>
          </div>

          <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-5 w-5 text-amber-400" />
              <span className="text-sm text-slate-400">Revoked</span>
            </div>
            <p className="text-2xl font-bold text-white">{stats.revoked}</p>
            <p className="text-xs text-slate-500 mt-1">+{stats.recentRevoked} this week</p>
          </div>

          <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-5 w-5 text-amber-400" />
              <span className="text-sm text-slate-400">Expired</span>
            </div>
            <p className="text-2xl font-bold text-white">{stats.expired}</p>
            <p className="text-xs text-slate-500 mt-1">Need renewal</p>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-white/10 bg-slate-900/60 p-6">
        <h4 className="font-semibold text-white mb-4">Recent Certificates</h4>
        <div className="space-y-2">
          {recentCertificates.map((cert) => (
            <div key={cert.id} className="flex flex-col gap-3 p-3 rounded-lg bg-slate-950/50 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="break-words font-medium text-white [overflow-wrap:anywhere]">{cert.certificateNumber}</p>
                <p className="break-words text-sm text-slate-400 [overflow-wrap:anywhere]">Course ID: {cert.courseId}</p>
              </div>
              <div className="shrink-0 sm:text-right">
                <span className={`text-xs px-2 py-1 rounded ${
                  cert.status === "ACTIVE" ? "bg-emerald-500/20 text-emerald-400" :
                  cert.status === "REVOKED" ? "bg-red-500/20 text-red-400" :
                  "bg-amber-500/20 text-amber-400"
                }`}>
                  {cert.status}
                </span>
                <p className="text-xs text-slate-500 mt-1">{new Date(cert.issuedAt).toLocaleDateString()}</p>
              </div>
            </div>
          ))}
        </div>
        {recentCertificates.length === 0 && (
          <p className="text-center text-slate-400 py-4">No recent certificates</p>
        )}
      </div>
    </div>
  );
}
