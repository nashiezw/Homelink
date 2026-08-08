"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Award, CheckCircle, Clock, Download, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";
import { useApp } from "@/components/providers/app-provider";
import {
  AdminDataTable,
  AdminEmptyState,
  AdminMetricGrid,
  AdminStatPill,
  AdminStatusBadge,
} from "@/components/admin/ui/admin-ui";

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

type MonitoringResponse = {
  stats: CertificateStats;
  recentCertificates: RecentCertificate[];
};

export function CertificateMonitoringDashboard() {
  const { showToast } = useApp();
  const [stats, setStats] = useState<CertificateStats | null>(null);
  const [recentCertificates, setRecentCertificates] = useState<RecentCertificate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadMonitoringData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadMonitoringData() {
    setLoading(true);
    const result = await apiFetch<MonitoringResponse>("/api/v1/admin/academy/certificates/monitoring");
    if (result.data) {
      setStats(result.data.stats);
      setRecentCertificates(result.data.recentCertificates ?? []);
    } else {
      showToast(result.error?.message ?? "Certificate monitoring could not be loaded.", "error");
    }
    setLoading(false);
  }

  const activePercentage = stats && stats.totalIssued > 0 ? ((stats.active / stats.totalIssued) * 100).toFixed(1) : "0.0";
  const expiringSoon = useMemo(() => {
    const soon = Date.now() + 30 * 86400000;
    return recentCertificates.filter((cert) => cert.expiresAt && new Date(cert.expiresAt).getTime() <= soon && cert.status === "ACTIVE").length;
  }, [recentCertificates]);

  function exportRecentCertificates() {
    const csv = [
      ["Certificate Number", "Status", "Course ID", "Agent ID", "Issued At", "Expires At"],
      ...recentCertificates.map((cert) => [
        cert.certificateNumber,
        cert.status,
        cert.courseId,
        cert.agentId,
        cert.issuedAt,
        cert.expiresAt ?? "",
      ]),
    ].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `certificate-monitoring-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast("Certificate monitoring export downloaded.");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-lg font-bold text-white">Certificate Monitoring</h3>
          <p className="text-sm text-slate-400">Track issuance volume, certificate status, and recent verification records.</p>
        </div>
        <div className="grid gap-2 sm:flex">
          <Button className="w-full sm:w-auto" variant="secondary" onClick={exportRecentCertificates} disabled={!recentCertificates.length}>
            <Download className="mr-2 size-4" />
            Export
          </Button>
          <Button className="w-full sm:w-auto" onClick={loadMonitoringData} disabled={loading}>
            {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <RefreshCw className="mr-2 size-4" />}
            Refresh
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-slate-400" />
        </div>
      ) : (
        <>
          <AdminMetricGrid cols={4}>
            <Metric icon={Award} label="Total Issued" value={stats?.totalIssued ?? 0} detail={`+${stats?.recentIssued ?? 0} this week`} tone="info" />
            <Metric icon={CheckCircle} label="Active" value={stats?.active ?? 0} detail={`${activePercentage}% of total`} tone="success" />
            <Metric icon={AlertCircle} label="Revoked" value={stats?.revoked ?? 0} detail={`+${stats?.recentRevoked ?? 0} this week`} tone={(stats?.revoked ?? 0) ? "warning" : "default"} />
            <Metric icon={Clock} label="Expired / Soon" value={`${stats?.expired ?? 0} / ${expiringSoon}`} detail="Expired or expiring in 30 days" tone={(stats?.expired ?? 0) || expiringSoon ? "warning" : "default"} />
          </AdminMetricGrid>

          <section className="rounded-xl border border-white/10 bg-slate-900/60 p-4 sm:p-6">
            <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h4 className="font-semibold text-white">Recent Certificates</h4>
                <p className="text-sm text-slate-500">Newest certificate records returned by the production database.</p>
              </div>
            </div>
            {recentCertificates.length ? (
              <AdminDataTable
                rows={recentCertificates}
                columns={[
                  {
                    key: "number",
                    header: "Certificate",
                    render: (cert) => (
                      <a
                        href={`/verify/certificate/${encodeURIComponent(cert.certificateNumber)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-w-0 items-center gap-2 break-words font-semibold text-emerald-300 hover:underline [overflow-wrap:anywhere]"
                      >
                        {cert.certificateNumber}
                        <ExternalLink className="size-3 shrink-0" />
                      </a>
                    ),
                  },
                  { key: "status", header: "Status", render: (cert) => <CertificateStatus status={cert.status} /> },
                  { key: "course", header: "Course ID", render: (cert) => <span className="break-words [overflow-wrap:anywhere]">{cert.courseId}</span> },
                  { key: "issued", header: "Issued", render: (cert) => new Date(cert.issuedAt).toLocaleDateString() },
                  { key: "expires", header: "Expires", render: (cert) => cert.expiresAt ? new Date(cert.expiresAt).toLocaleDateString() : "No expiry" },
                ]}
              />
            ) : (
              <AdminEmptyState icon={Award} title="No recent certificates" description="Certificates will appear here after issuance." />
            )}
          </section>
        </>
      )}
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: typeof Award;
  label: string;
  value: string | number;
  detail: string;
  tone: "default" | "success" | "warning" | "danger" | "info";
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
      <div className="mb-2 flex items-center gap-2">
        <Icon className="size-5 text-emerald-400" />
        <span className="text-sm text-slate-400">{label}</span>
      </div>
      <AdminStatPill label={label} value={value} tone={tone} />
      <p className="mt-2 text-xs text-slate-500">{detail}</p>
    </div>
  );
}

function CertificateStatus({ status }: { status: string }) {
  return (
    <AdminStatusBadge
      status={status}
      variant={status === "ACTIVE" ? "success" : status === "REVOKED" ? "danger" : status === "EXPIRED" ? "warning" : "muted"}
    />
  );
}
