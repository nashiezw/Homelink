import { getCertificate } from "@/lib/academy/certificate-repository";
import { CertificateDocument } from "@/components/academy/certificate-document";
import { ShieldCheck, AlertTriangle } from "lucide-react";

export default async function CertificateVerificationPage({
  params,
}: {
  params: Promise<{ certificateNumber: string }>;
}) {
  const { certificateNumber } = await params;
  const certificate = await getCertificate(certificateNumber);

  if (!certificate) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Certificate Not Found</h1>
            <p className="text-slate-600 mb-6">
              The certificate number <code className="bg-slate-100 px-2 py-1 rounded">{certificateNumber}</code> could not be found or may have been revoked.
            </p>
            <p className="text-sm text-slate-500">
              Please verify the certificate number and try again, or contact support if you believe this is an error.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const isExpired = certificate.expiresAt && new Date(certificate.expiresAt) < new Date();
  const isRevoked = certificate.status !== "ACTIVE";

  if (isExpired || isRevoked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
              <AlertTriangle className="h-8 w-8 text-amber-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Certificate Invalid</h1>
            <p className="text-slate-600 mb-4">
              This certificate exists but is currently invalid.
            </p>
            <div className="space-y-2 text-sm text-slate-500">
              {isExpired && <p>• Certificate expired on {new Date(certificate.expiresAt!).toLocaleDateString()}</p>}
              {isRevoked && <p>• Certificate status: {certificate.status}</p>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-800 px-4 py-2 rounded-full text-sm font-semibold mb-4">
            <ShieldCheck className="h-4 w-4" />
            Verified Certificate
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Certificate Verification</h1>
          <p className="text-slate-600 mt-2">
            This certificate has been verified as authentic and valid.
          </p>
        </div>

        <CertificateDocument
          learnerName="Certificate Holder"
          courseTitle={certificate.course?.title || "Course"}
          certificateTitle="Certificate of Achievement"
          certificateNumber={certificate.certificateNumber}
          issuedAt={certificate.issuedAt.toISOString()}
          expiresAt={certificate.expiresAt?.toISOString()}
          verifyUrl={`/verify/certificate/${certificate.certificateNumber}`}
        />

        <div className="mt-8 text-center">
          <div className="inline-block bg-white rounded-xl shadow-sm p-6 max-w-2xl">
            <h3 className="font-semibold text-slate-900 mb-3">Certificate Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="text-left">
                <p className="text-slate-500">Certificate Number</p>
                <p className="font-medium text-slate-900">{certificate.certificateNumber}</p>
              </div>
              <div className="text-left">
                <p className="text-slate-500">Status</p>
                <p className="font-medium text-emerald-600">Valid</p>
              </div>
              <div className="text-left">
                <p className="text-slate-500">Issued Date</p>
                <p className="font-medium text-slate-900">{new Date(certificate.issuedAt).toLocaleDateString()}</p>
              </div>
              <div className="text-left">
                <p className="text-slate-500">Expiry Date</p>
                <p className="font-medium text-slate-900">
                  {certificate.expiresAt ? new Date(certificate.expiresAt).toLocaleDateString() : "No expiry"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
