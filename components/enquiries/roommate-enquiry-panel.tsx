"use client";

import { Send, UserPlus } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/providers/app-provider";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";

type RoommateEnquiryPanelProps = {
  roommateUserId: string;
  roommateName: string;
  lookingFor: "room" | "roommate";
};

export function RoommateEnquiryPanel({ roommateUserId, roommateName, lookingFor }: RoommateEnquiryPanelProps) {
  const { user, showToast } = useApp();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");

  const primaryLabel =
    lookingFor === "room" ? "Enquire about sharing" : "Request roommate match";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) {
      showToast("Please add a short message.", "error");
      return;
    }

    setSubmitting(true);
    const result = await apiFetch<{ id: string }>("/api/v1/enquiries/roommate", {
      method: "POST",
      body: JSON.stringify({
        roommateUserId,
        roommateName,
        name,
        email,
        phone,
        message,
        enquiryType: "ROOMMATE_MATCH",
      }),
    });
    setSubmitting(false);

    if (result.data) {
      setOpen(false);
      setMessage("");
      showToast("Enquiry sent to HomeLink. A consultant will qualify and coordinate next steps.");
      if (user) router.push("/enquiries");
    } else {
      showToast(result.error?.message ?? "Could not submit enquiry.", "error");
    }
  }

  return (
    <>
      <Button className="w-full" onClick={() => setOpen(true)}>
        <UserPlus className="mr-2 size-4" />
        {primaryLabel}
      </Button>
      <p className="mt-2 text-center text-xs text-slate-500">
        Managed by HomeLink — no direct contact details shared
      </p>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={(e) => void submit(e)}
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-slate-900"
          >
            <h3 className="text-lg font-semibold">Contact via HomeLink</h3>
            <p className="mt-1 text-sm text-slate-500">
              Enquire about {roommateName}. A property consultant will manage the process.
            </p>

            {!user && (
              <>
                <label className="mt-4 block text-sm font-medium">
                  Your name
                  <input required value={name} onChange={(e) => setName(e.target.value)} className="mt-1 h-11 w-full rounded-lg border border-slate-200 px-3 dark:border-slate-600 dark:bg-slate-950" />
                </label>
                <label className="mt-3 block text-sm font-medium">
                  Email
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 h-11 w-full rounded-lg border border-slate-200 px-3 dark:border-slate-600 dark:bg-slate-950" />
                </label>
                <label className="mt-3 block text-sm font-medium">
                  Phone
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1 h-11 w-full rounded-lg border border-slate-200 px-3 dark:border-slate-600 dark:bg-slate-950" />
                </label>
              </>
            )}

            <label className="mt-3 block text-sm font-medium">
              Message
              <textarea
                required
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us what you're looking for..."
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-600 dark:bg-slate-950"
              />
            </label>

            <div className="mt-5 flex gap-2">
              <Button type="submit" className="flex-1" disabled={submitting}>
                <Send className="size-4" />
                {submitting ? "Sending..." : "Submit enquiry"}
              </Button>
              <Button type="button" variant="secondary" className="flex-1" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
