"use client";

import { BadgeCheck, Save, Sparkles, UserRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ResidenceHistoryPanel } from "@/components/residence/residence-history-panel";
import { defaultMatchPanel } from "@/components/roommates/match-preferences-form";
import { useApp } from "@/components/providers/app-provider";
import { Button } from "@/components/ui/button";
import { ImageUploader } from "@/components/ui/image-uploader";
import { apiFetch } from "@/lib/api/client";
import {
  GENDER_OPTIONS,
  HOUSEHOLD_OPTIONS,
  MARITAL_OPTIONS,
  RELIGION_OPTIONS,
  householdOccupants,
  type HouseholdType,
} from "@/lib/roommates/types";
import type { RoommateMatch, RoommateProfile } from "@/lib/store/types";

const fieldClass =
  "mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15";

export function RoommateProfileEditor() {
  const router = useRouter();
  const { user, showToast } = useApp();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [matching, setMatching] = useState(false);
  const [matches, setMatches] = useState<RoommateMatch[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [form, setForm] = useState({
    lookingFor: "roommate" as "room" | "roommate",
    budgetMin: defaultMatchPanel.budgetMin,
    budgetMax: defaultMatchPanel.budgetMax,
    occupation: "",
    locations: defaultMatchPanel.location,
    suburb: "",
    lifestyle: "",
    smoking: false,
    pets: false,
    furnished: false,
    availableNow: false,
    gender: defaultMatchPanel.gender,
    genderPreference: defaultMatchPanel.genderPreference,
    age: defaultMatchPanel.age,
    preferredAgeMin: defaultMatchPanel.preferredAgeMin,
    preferredAgeMax: defaultMatchPanel.preferredAgeMax,
    religion: defaultMatchPanel.religion,
    religionPreference: defaultMatchPanel.religionPreference,
    maritalStatus: defaultMatchPanel.maritalStatus,
    maritalStatusPreference: defaultMatchPanel.maritalStatusPreference,
    householdType: defaultMatchPanel.householdType,
    householdSize: defaultMatchPanel.householdSize,
    moveInDate: "",
    bio: "",
    active: true,
  });

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    void apiFetch<{ profile: RoommateProfile | null; matches: RoommateMatch[] }>("/api/v1/roommates/profile").then(
      (result) => {
        const p = result.data?.profile;
        if (p) {
          setForm({
            lookingFor: p.lookingFor,
            budgetMin: String(p.budgetMin),
            budgetMax: String(p.budgetMax),
            occupation: p.occupation ?? "",
            locations: p.preferredLocations?.join(", ") ?? "",
            suburb: p.suburb ?? "",
            lifestyle: p.lifestyle ?? "",
            smoking: p.smoking,
            pets: p.pets,
            furnished: p.furnished,
            availableNow: p.availableNow,
            gender: p.gender,
            genderPreference: p.genderPreference,
            age: String(p.age),
            preferredAgeMin: String(p.preferredAgeMin),
            preferredAgeMax: String(p.preferredAgeMax),
            religion: p.religion,
            religionPreference: p.religionPreference,
            maritalStatus: p.maritalStatus,
            maritalStatusPreference: p.maritalStatusPreference,
            householdType: p.householdType,
            householdSize: String(p.householdSize),
            moveInDate: p.moveInDate ?? "",
            bio: p.bio ?? "",
            active: p.active !== false,
          });
          setPhotos(p.photos?.length ? p.photos : p.photoUrl ? [p.photoUrl] : []);
        }
        setMatches(result.data?.matches ?? []);
        setLoading(false);
      },
    );
  }, [user]);

  function buildPayload() {
    return {
      lookingFor: form.lookingFor,
      budgetMin: Number(form.budgetMin),
      budgetMax: Number(form.budgetMax),
      occupation: form.occupation,
      preferredLocations: form.locations,
      suburb: form.suburb,
      lifestyle: form.lifestyle,
      smoking: form.smoking,
      pets: form.pets,
      furnished: form.furnished,
      availableNow: form.availableNow,
      gender: form.gender,
      genderPreference: form.genderPreference,
      age: Number(form.age),
      preferredAgeMin: Number(form.preferredAgeMin),
      preferredAgeMax: Number(form.preferredAgeMax),
      religion: form.religion,
      religionPreference: form.religionPreference,
      maritalStatus: form.maritalStatus,
      maritalStatusPreference: form.maritalStatusPreference,
      householdType: form.householdType,
      householdSize: Number(form.householdSize),
      moveInDate: form.moveInDate || undefined,
      bio: form.bio,
      photoUrl: photos[0],
      photos,
      active: form.active,
    };
  }

  async function saveProfile(runMatch = false) {
    if (!user) {
      showToast("Sign in to manage your roommate profile.", "info");
      router.push("/auth?next=/roommates/profile");
      return;
    }
    if (runMatch) setMatching(true);
    else setSaving(true);

    const result = await apiFetch<{ profile: RoommateProfile; matches: RoommateMatch[] }>(
      "/api/v1/roommates/profile",
      { method: "PATCH", body: JSON.stringify(buildPayload()) },
    );

    setSaving(false);
    setMatching(false);

    if (result.data) {
      setMatches(result.data.matches);
      showToast(runMatch ? `${result.data.matches.length} matches found!` : "Profile saved.");
    } else {
      showToast(result.error?.message ?? "Could not save profile.", "error");
    }
  }

  if (!user) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
        <UserRound className="mx-auto size-12 text-emerald-600" />
        <h2 className="mt-4 text-xl font-bold text-ink">Your roommate profile</h2>
        <p className="mt-2 text-slate-600">Sign in to create and edit your profile, upload photos, and get matches.</p>
        <Link href="/auth?next=/roommates/profile" className="mt-6 inline-block">
          <Button>Sign in</Button>
        </Link>
      </div>
    );
  }

  if (loading) {
    return <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-500">Loading profile...</div>;
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <form
        className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        onSubmit={(e) => {
          e.preventDefault();
          void saveProfile(false);
        }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-ink">Roommate profile</h2>
            <p className="mt-1 text-sm text-slate-500">
              Visible profiles can be discovered by others. Room seekers see listings; roommate seekers see people.
              If you have a spare room, also{" "}
              <Link href="/dashboard/landlord/new" className="font-medium text-emerald-700 hover:underline">
                list your room
              </Link>
              .
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
              className="size-4 rounded border-slate-300 text-emerald-600"
            />
            Profile visible to matches
          </label>
        </div>

        <ImageUploader value={photos} onChange={setPhotos} max={4} folder="roommates" label="Profile photos" />

        <label className="block text-sm font-medium">
          About you
          <textarea
            rows={3}
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            placeholder="A short intro - work schedule, hobbies, what you're looking for in a home..."
            className={fieldClass}
          />
        </label>

        <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
          {(["room", "roommate"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setForm({ ...form, lookingFor: m })}
              className={`rounded-lg py-2.5 text-sm font-semibold transition ${
                form.lookingFor === m ? "bg-white text-emerald-800 shadow-sm" : "text-slate-500"
              }`}
            >
              {m === "room" ? "Looking for a room" : "Looking for a roommate"}
            </button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium">
            Preferred areas
            <input
              value={form.locations}
              onChange={(e) => setForm({ ...form, locations: e.target.value })}
              placeholder="Harare, Avondale, Borrowdale"
              className={fieldClass}
            />
          </label>
          <label className="block text-sm font-medium">
            Suburb
            <input
              value={form.suburb}
              onChange={(e) => setForm({ ...form, suburb: e.target.value })}
              className={fieldClass}
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block text-sm font-medium">
            Budget min (USD)
            <input value={form.budgetMin} onChange={(e) => setForm({ ...form, budgetMin: e.target.value })} className={fieldClass} inputMode="numeric" />
          </label>
          <label className="block text-sm font-medium">
            Budget max (USD)
            <input value={form.budgetMax} onChange={(e) => setForm({ ...form, budgetMax: e.target.value })} className={fieldClass} inputMode="numeric" />
          </label>
          <label className="block text-sm font-medium">
            Move-in date
            <input type="date" value={form.moveInDate} onChange={(e) => setForm({ ...form, moveInDate: e.target.value })} className={fieldClass} />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium">
            Occupation
            <input value={form.occupation} onChange={(e) => setForm({ ...form, occupation: e.target.value })} className={fieldClass} />
          </label>
          <label className="block text-sm font-medium">
            Lifestyle
            <select value={form.lifestyle} onChange={(e) => setForm({ ...form, lifestyle: e.target.value })} className={fieldClass}>
              <option value="">Select</option>
              <option value="quiet">Quiet & studious</option>
              <option value="social">Social & outgoing</option>
              <option value="professional">Working professional</option>
              <option value="student">Student</option>
            </select>
          </label>
        </div>

        <div className="flex flex-wrap gap-4 text-sm">
          {[
            ["smoking", "Smoker"],
            ["pets", "Have pets"],
            ["furnished", "Need furnished"],
            ["availableNow", "Available now"],
          ].map(([key, label]) => (
            <label key={key} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form[key as keyof typeof form] as boolean}
                onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
                className="size-4 rounded border-slate-300 text-emerald-600"
              />
              {label}
            </label>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block text-sm font-medium">
            Your gender
            <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} className={fieldClass}>
              {GENDER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium">
            Age
            <input value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} className={fieldClass} inputMode="numeric" />
          </label>
          <label className="block text-sm font-medium">
            Religion
            <select value={form.religion} onChange={(e) => setForm({ ...form, religion: e.target.value })} className={fieldClass}>
              {RELIGION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
        </div>

        {form.lookingFor === "roommate" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium">
              Preferred roommate gender
              <select value={form.genderPreference} onChange={(e) => setForm({ ...form, genderPreference: e.target.value })} className={fieldClass}>
                <option value="any">Any</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
              </select>
            </label>
            <label className="block text-sm font-medium">
              Preferred age range
              <div className="mt-1 flex gap-2">
                <input value={form.preferredAgeMin} onChange={(e) => setForm({ ...form, preferredAgeMin: e.target.value })} className={fieldClass} inputMode="numeric" />
                <input value={form.preferredAgeMax} onChange={(e) => setForm({ ...form, preferredAgeMax: e.target.value })} className={fieldClass} inputMode="numeric" />
              </div>
            </label>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium">
            Marital status
            <select value={form.maritalStatus} onChange={(e) => setForm({ ...form, maritalStatus: e.target.value })} className={fieldClass}>
              {MARITAL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium">
            Household type
            <select
              value={form.householdType}
              onChange={(e) => {
                const ht = e.target.value;
                setForm({
                  ...form,
                  householdType: ht,
                  householdSize: String(householdOccupants(ht as HouseholdType)),
                });
              }}
              className={fieldClass}
            >
              {HOUSEHOLD_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <Button type="submit" disabled={saving}>
            <Save className="size-4" />
            {saving ? "Saving..." : "Save profile"}
          </Button>
          <Button type="button" variant="secondary" disabled={matching} onClick={() => void saveProfile(true)}>
            <Sparkles className="size-4" />
            {matching ? "Matching..." : "Save & find matches"}
          </Button>
        </div>
      </form>

      <aside className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            {photos[0] ? (
              <div className="relative size-14 overflow-hidden rounded-full">
                <Image src={photos[0]} alt="" fill className="object-cover" sizes="56px" />
              </div>
            ) : (
              <span className="flex size-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                <UserRound className="size-7" />
              </span>
            )}
            <div>
              <p className="font-semibold text-ink">{user.name}</p>
              <p className="text-sm text-slate-500">{form.lookingFor === "room" ? "Seeking a room" : "Seeking a roommate"}</p>
            </div>
          </div>
          {form.bio && <p className="mt-3 text-sm text-slate-600 line-clamp-4">{form.bio}</p>}
          {form.active && (
            <p className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-emerald-700">
              <BadgeCheck className="size-3.5" />
              Visible to matches
            </p>
          )}
        </div>

        {matches.length > 0 && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-5">
            <h3 className="font-semibold text-ink">Your matches ({matches.length})</h3>
            <ul className="mt-3 space-y-2">
              {matches.slice(0, 5).map((m) => (
                <li key={m.id} className="rounded-lg bg-white px-3 py-2 text-sm">
                  <p className="font-medium">{m.kind === "room" ? m.title : m.name}</p>
                  <p className="text-slate-500">{m.compatibility}% match  / {m.city}</p>
                </li>
              ))}
            </ul>
            <Link href="/roommates" className="mt-3 inline-block text-sm font-semibold text-emerald-700 hover:underline">
              View all on roommates page
            </Link>
          </div>
        )}

        <ResidenceHistoryPanel />

        <Link href="/roommates">
          <Button variant="secondary" className="w-full">Browse HouseLink introductions</Button>
        </Link>
      </aside>
    </div>
  );
}
