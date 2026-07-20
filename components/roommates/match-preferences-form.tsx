"use client";

/* eslint-disable @next/next/no-img-element -- room photo previews may be local data/object URLs before upload */

import { ArrowLeft, ArrowRight, Calendar, Home, ImagePlus, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { roommateAmenityFilters } from "@/lib/roommates/content";
import { cn } from "@/lib/utils";

/** @deprecated — used by profile editor; hero wizard uses RoomSharePanelState */
export type MatchPanelState = {
  location: string;
  budgetMin: string;
  budgetMax: string;
  moveIn: string;
  lifestyle: string;
  occupation: string;
  smoking: boolean;
  pets: boolean;
  gender: string;
  genderPreference: string;
  age: string;
  preferredAgeMin: string;
  preferredAgeMax: string;
  religion: string;
  religionPreference: string;
  maritalStatus: string;
  maritalStatusPreference: string;
  householdType: string;
  householdSize: string;
};

export type RoomShareIntent = "seeking" | "posting";

export type RoomSharePanelState = {
  location: string;
  budgetMin: string;
  budgetMax: string;
  moveIn: string;
  roomType: string;
  householdType: string;
  genderPreference: string;
  lifestyle: string;
  smoking: boolean;
  pets: boolean;
  furnished: boolean;
  description: string;
};

export const defaultMatchPanel: MatchPanelState = {
  location: "Harare",
  budgetMin: "120",
  budgetMax: "300",
  moveIn: "",
  lifestyle: "",
  occupation: "",
  smoking: false,
  pets: false,
  gender: "female",
  genderPreference: "any",
  age: "25",
  preferredAgeMin: "20",
  preferredAgeMax: "35",
  religion: "christian",
  religionPreference: "any",
  maritalStatus: "single",
  maritalStatusPreference: "any",
  householdType: "single",
  householdSize: "1",
};

export const defaultRoomSharePanel: RoomSharePanelState = {
  location: "Harare",
  budgetMin: "80",
  budgetMax: "300",
  moveIn: "",
  roomType: "room",
  householdType: "single",
  genderPreference: "any",
  lifestyle: "",
  smoking: false,
  pets: false,
  furnished: false,
  description: "",
};

type RoomShareWizardProps = {
  intent: RoomShareIntent;
  onIntentChange: (intent: RoomShareIntent) => void;
  panel: RoomSharePanelState;
  onChange: (panel: RoomSharePanelState) => void;
  amenities: string[];
  onToggleAmenity: (label: string) => void;
  onSubmit: () => void;
  submitting?: boolean;
  variant?: "card" | "band";
  liveStats?: Array<{ label: string; value: string }>;
};

const fieldClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10";

const labelClass = "mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500";

const SEEKING_STEPS = [
  { title: "Where", hint: "Area & budget" },
  { title: "Your needs", hint: "Room & lifestyle" },
  { title: "Must-haves", hint: "Amenities & habits" },
] as const;

const POSTING_STEPS = [
  { title: "Location", hint: "Where is the room" },
  { title: "Photos", hint: "Show the room clearly" },
  { title: "Room details", hint: "Rent, type & setup" },
  { title: "Ideal tenant", hint: "Who fits your home" },
  { title: "Review", hint: "Confirm and continue" },
] as const;

const householdOptions = [
  { value: "single", seeking: "Single person", posting: "Single person" },
  { value: "couple", seeking: "Couple (2 people)", posting: "Couple (2 people)" },
  { value: "small-family", seeking: "Small family (3-4 people)", posting: "Small family (3-4 people)" },
  { value: "big-family", seeking: "Big family (5+ people)", posting: "Big family (5+ people)" },
] as const;

function householdLabel(value: string) {
  return householdOptions.find((option) => option.value === value)?.seeking ?? "Single person";
}

export function RoomShareWizard({
  intent,
  onIntentChange,
  panel,
  onChange,
  amenities,
  onToggleAmenity,
  onSubmit,
  submitting,
  variant = "card",
  liveStats = [],
}: RoomShareWizardProps) {
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [roomPhotos, setRoomPhotos] = useState<Array<{ id: string; name: string; url: string }>>([]);
  const photoUrlsRef = useRef<string[]>([]);
  const steps = intent === "seeking" ? SEEKING_STEPS : POSTING_STEPS;
  const isLastStep = step === steps.length - 1;
  const seeking = intent === "seeking";

  useEffect(() => {
    setStep(0);
    setError("");
  }, [intent]);

  useEffect(() => {
    const photoUrls = photoUrlsRef.current;
    return () => {
      photoUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  function set<K extends keyof RoomSharePanelState>(key: K, value: RoomSharePanelState[K]) {
    setError("");
    const nextPanel = { ...panel, [key]: value };
    if (key === "householdType" && value !== "single") nextPanel.genderPreference = "any";
    onChange(nextPanel);
  }

  function validateStep() {
    if (step === 0) {
      const location = panel.location.trim();
      const min = Number(panel.budgetMin);
      const max = Number(panel.budgetMax);
      if (!location) return "Add a preferred area so we can match you properly.";
      if (seeking && (!panel.budgetMin || !panel.budgetMax || Number.isNaN(min) || Number.isNaN(max))) {
        return "Add a valid budget range before continuing.";
      }
      if (seeking && min > max) return "Budget minimum cannot be higher than budget maximum.";
    }
    if (seeking && step === 1 && !panel.householdType) {
      return "Choose who is moving in so the room match is accurate.";
    }
    if (seeking && step === 1 && !panel.lifestyle) {
      return "Choose your lifestyle so roommate matches feel relevant.";
    }
    if (!seeking && step === 1 && roomPhotos.length === 0) {
      return "Upload at least one clear room photo before continuing.";
    }
    if (!seeking && step === 2) {
      const max = Number(panel.budgetMax);
      if (!panel.budgetMax || Number.isNaN(max) || max <= 0) {
        return "Add a valid monthly rent before continuing.";
      }
    }
    if (!seeking && step === 3 && !panel.householdType) {
      return "Choose the household size you can accept.";
    }
    if (!seeking && step === 3 && !panel.lifestyle) {
      return "Choose the household vibe so seekers know if it fits.";
    }
    if (!seeking && step === 4 && panel.description.trim().length < 12) {
      return "Add a short room description so the listing feels complete.";
    }
    return "";
  }

  function addRoomPhotos(files: FileList | null) {
    if (!files) return;
    setError("");
    const remainingSlots = Math.max(0, 6 - roomPhotos.length);
    const selectedFiles = Array.from(files)
      .filter((file) => file.type.startsWith("image/"))
      .slice(0, remainingSlots);

    if (!selectedFiles.length) {
      if (roomPhotos.length >= 6) setError("You can add up to 6 room photos for this quick listing.");
      return;
    }

    const nextPhotos = selectedFiles.map((file) => {
      const url = URL.createObjectURL(file);
      photoUrlsRef.current.push(url);
      return {
        id: `${file.name}-${file.lastModified}-${url}`,
        name: file.name,
        url,
      };
    });

    setRoomPhotos((current) => [...current, ...nextPhotos]);
  }

  function removeRoomPhoto(id: string) {
    setRoomPhotos((current) => {
      const photo = current.find((item) => item.id === id);
      if (photo) URL.revokeObjectURL(photo.url);
      return current.filter((item) => item.id !== id);
    });
  }

  function goNext() {
    const nextError = validateStep();
    if (nextError) {
      setError(nextError);
      return;
    }
    setError("");
    if (isLastStep) onSubmit();
    else setStep((s) => s + 1);
  }

  function goBack() {
    setError("");
    setStep((s) => Math.max(0, s - 1));
  }

  return (
    <div
      id="room-share-wizard"
      className={cn(
        "relative flex w-full flex-col overflow-hidden border bg-white p-4 sm:p-5",
        variant === "band"
          ? "rounded-[1.75rem] border-white/80 bg-white shadow-[0_18px_60px_rgba(2,12,18,0.18),0_0_0_1px_rgba(16,185,129,0.12)] lg:p-6"
          : "max-w-sm rounded-3xl border-white/80 shadow-[0_28px_70px_rgba(0,0,0,0.35)] lg:max-w-[23rem]",
      )}
    >
      {variant === "band" && (
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600" />
      )}
      <div className={cn(variant === "band" && "lg:grid lg:grid-cols-1")}>
        <div className={cn(variant === "band" ? "lg:grid lg:grid-cols-[1.1fr_1fr_auto] lg:items-center lg:gap-5 xl:grid-cols-[1.1fr_1fr_1fr_auto]" : "")}>
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-900/25">
              {seeking ? <Search className="size-5" /> : <Home className="size-5" />}
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">Room sharing</p>
              <h2 className="text-lg font-bold leading-tight text-ink">
                {seeking ? "Find a room to share" : "Post a room to share"}
              </h2>
            </div>
          </div>
          <p className={cn("mt-2 text-sm leading-relaxed text-slate-600", variant === "band" && "lg:mt-0")}>
            {seeking
              ? "Search verified rooms in shared homes across Zimbabwe."
              : "List your spare room and find a trustworthy housemate."}
          </p>
          <p className={cn("mt-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 ring-1 ring-slate-100", variant === "band" && "hidden xl:block")}>
            {seeking
              ? "For room seekers: set your area, budget, lifestyle, and must-haves."
              : "For hosts: add location, photos, rent, room setup, and ideal tenant details."}
          </p>
          {variant === "band" && (
            <div className="mt-4 flex gap-2 lg:mt-0 lg:shrink-0">
              {(liveStats.length ? liveStats : [{ value: "Live", label: "rooms" }, { value: "Verified", label: "profiles" }]).map((stat) => (
                <span key={stat.label} className="rounded-2xl bg-emerald-50 px-4 py-2 text-center ring-1 ring-emerald-100">
                  <b className="block text-sm text-emerald-800">{stat.value}</b>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{stat.label}</span>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className={cn("mt-5 flex-1", variant === "band" && "lg:mt-5")}>
          <div className="grid grid-cols-2 gap-1.5 rounded-2xl bg-slate-100 p-1.5 ring-1 ring-slate-200/70">
            {(
              [
                { id: "seeking" as const, label: "I need a room" },
                { id: "posting" as const, label: "I have a room" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onIntentChange(opt.id)}
                className={cn(
                  "rounded-xl py-2.5 text-sm font-semibold transition",
                  intent === opt.id ? "bg-white text-emerald-800 shadow-sm ring-1 ring-emerald-200/60" : "text-slate-500 hover:text-slate-700",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="mt-3">
            <div className="flex items-center justify-between gap-2">
              {steps.map((s, i) => (
                <div key={s.title} className="flex flex-1 flex-col items-center gap-1">
                  <span
                    className={cn(
                      "flex size-7 items-center justify-center rounded-full text-xs font-bold transition",
                      i <= step ? "bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-md" : "bg-slate-200 text-slate-500",
                    )}
                  >
                    {i + 1}
                  </span>
                  <span className={cn("hidden text-[9px] font-semibold sm:block", i === step ? "text-emerald-800" : "text-slate-400")}>
                    {s.title}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300"
                style={{ width: `${((step + 1) / steps.length) * 100}%` }}
              />
            </div>
            <p className="mt-2 text-center text-xs font-medium text-slate-500">
              Step {step + 1} of {steps.length} - {steps[step].hint}
            </p>
          </div>

          <div className={cn("mt-4 flex flex-1 flex-col", variant === "band" ? "min-h-0" : "min-h-[16rem]")}>
        <div className="space-y-3">
          {/* Step 1 - location */}
          {step === 0 && (
            <>
              <label className="block">
                <span className={labelClass}>{seeking ? "Preferred area" : "City & suburb"}</span>
                <input
                  value={panel.location}
                  onChange={(e) => set("location", e.target.value)}
                  placeholder="Harare, Avondale..."
                  className={fieldClass}
                />
              </label>
              {seeking ? (
                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className={labelClass}>Budget min (USD)</span>
                    <input value={panel.budgetMin} onChange={(e) => set("budgetMin", e.target.value)} className={fieldClass} inputMode="numeric" />
                  </label>
                  <label className="block">
                    <span className={labelClass}>Budget max (USD)</span>
                    <input value={panel.budgetMax} onChange={(e) => set("budgetMax", e.target.value)} className={fieldClass} inputMode="numeric" />
                  </label>
                </div>
              ) : null}
              <label className="block">
                <span className={labelClass}>{seeking ? "Move-in date" : "Available from"}</span>
                <div className="relative">
                  <Calendar className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
                  <input type="date" value={panel.moveIn} onChange={(e) => set("moveIn", e.target.value)} className={`${fieldClass} pl-9`} />
                </div>
              </label>
            </>
          )}

          {!seeking && step === 1 && (
            <div className="space-y-3">
              <div>
                <span className={labelClass}>Room photos</span>
                <label className="flex min-h-[8.5rem] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-emerald-300 bg-emerald-50/60 px-4 py-5 text-center transition hover:border-emerald-500 hover:bg-emerald-50">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="sr-only"
                    onChange={(event) => {
                      addRoomPhotos(event.currentTarget.files);
                      event.currentTarget.value = "";
                    }}
                  />
                  <span className="flex size-11 items-center justify-center rounded-2xl bg-white text-emerald-700 shadow-sm ring-1 ring-emerald-100">
                    <ImagePlus className="size-5" />
                  </span>
                  <span className="mt-3 text-sm font-bold text-emerald-900">Upload room photos</span>
                  <span className="mt-1 max-w-sm text-xs leading-relaxed text-slate-600">
                    Add up to 6 real photos. Start with the bedroom, then bathroom, kitchen, entrance, and any shared spaces.
                  </span>
                </label>
              </div>
              {roomPhotos.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {roomPhotos.map((photo) => (
                    <div key={photo.id} className="group relative overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                      <img src={photo.url} alt={photo.name} className="aspect-[4/3] w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeRoomPhoto(photo.id)}
                        className="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-full bg-white/95 text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:text-rose-600"
                        aria-label={`Remove ${photo.name}`}
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-3 gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-2 text-center">
                <div className="rounded-xl bg-white p-2 ring-1 ring-slate-100">
                  <b className="block text-sm text-ink">{roomPhotos.length}/6</b>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">photos</span>
                </div>
                <div className="rounded-xl bg-white p-2 ring-1 ring-slate-100">
                  <b className="block text-sm text-ink">Real</b>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">only</span>
                </div>
                <div className="rounded-xl bg-white p-2 ring-1 ring-slate-100">
                  <b className="block text-sm text-ink">Clear</b>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">rooms</span>
                </div>
              </div>
            </div>
          )}

          {((seeking && step === 1) || (!seeking && step === 2)) && (
            <>
              {!seeking && (
                <label className="block">
                  <span className={labelClass}>Monthly rent (USD)</span>
                  <input value={panel.budgetMax} onChange={(e) => set("budgetMax", e.target.value)} className={fieldClass} inputMode="numeric" placeholder="e.g. 300" />
                </label>
              )}
              <label className="block">
                <span className={labelClass}>Room type</span>
                <select value={panel.roomType} onChange={(e) => set("roomType", e.target.value)} className={fieldClass}>
                  <option value="room">Room in shared home</option>
                  <option value="flat">Flat / house share</option>
                  <option value="cottage">Cottage / granny flat</option>
                </select>
              </label>
              {seeking && (
                <>
                  <label className="block">
                    <span className={labelClass}>Who is moving in?</span>
                    <select value={panel.householdType} onChange={(e) => set("householdType", e.target.value)} className={fieldClass}>
                      {householdOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.seeking}
                        </option>
                      ))}
                    </select>
                    <span className="mt-1.5 block text-xs font-medium text-slate-500">
                      {panel.householdType === "single"
                        ? "This helps match you with rooms that can comfortably fit your household."
                        : "Gender preference is skipped for couples and families because the household is mixed or multi-person."}
                    </span>
                  </label>
                  <label className="block">
                    <span className={labelClass}>Your lifestyle</span>
                    <select value={panel.lifestyle} onChange={(e) => set("lifestyle", e.target.value)} className={fieldClass}>
                      <option value="">Select</option>
                      <option value="quiet">Quiet & studious</option>
                      <option value="social">Social & outgoing</option>
                      <option value="professional">Working professional</option>
                      <option value="student">Student-friendly</option>
                    </select>
                  </label>
                  {panel.householdType === "single" && (
                    <label className="block">
                      <span className={labelClass}>Preferred household gender</span>
                      <select value={panel.genderPreference} onChange={(e) => set("genderPreference", e.target.value)} className={fieldClass}>
                        <option value="any">Any</option>
                        <option value="female">Female</option>
                        <option value="male">Male</option>
                      </select>
                    </label>
                  )}
                </>
              )}
              {!seeking && (
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input type="checkbox" className="accent-emerald-700" checked={panel.furnished} onChange={(e) => set("furnished", e.target.checked)} />
                  Room is furnished
                </label>
              )}
            </>
          )}

          {(!seeking && step === 3) && (
            <>
              <label className="block">
                <span className={labelClass}>Household size accepted</span>
                <select value={panel.householdType} onChange={(e) => set("householdType", e.target.value)} className={fieldClass}>
                  {householdOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.posting}
                    </option>
                  ))}
                </select>
                <span className="mt-1.5 block text-xs font-medium text-slate-500">
                  {panel.householdType === "single"
                    ? "Choose the largest household size your room and house rules can comfortably accept."
                    : "Gender preference is skipped for couples and families because you are accepting a multi-person household."}
                </span>
              </label>
              <label className="block">
                <span className={labelClass}>Household vibe</span>
                <select value={panel.lifestyle} onChange={(e) => set("lifestyle", e.target.value)} className={fieldClass}>
                  <option value="">Select</option>
                  <option value="quiet">Quiet & studious</option>
                  <option value="social">Social & outgoing</option>
                  <option value="professional">Working professional</option>
                  <option value="student">Student-friendly</option>
                </select>
              </label>
              {panel.householdType === "single" && (
                <label className="block">
                  <span className={labelClass}>Preferred tenant gender</span>
                  <select value={panel.genderPreference} onChange={(e) => set("genderPreference", e.target.value)} className={fieldClass}>
                    <option value="any">Any</option>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                  </select>
                </label>
              )}
              <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-3">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Tenant can have</p>
                <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                  <label className="flex items-center gap-1.5">
                    <input type="checkbox" className="accent-emerald-700" checked={panel.smoking} onChange={(e) => set("smoking", e.target.checked)} />
                    Smoking
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input type="checkbox" className="accent-emerald-700" checked={panel.pets} onChange={(e) => set("pets", e.target.checked)} />
                    Pets
                  </label>
                </div>
              </div>
            </>
          )}

          {((seeking && step === 2) || (!seeking && step === 4)) && (
            <>
              {!seeking && (
                <label className="block">
                  <span className={labelClass}>Short description</span>
                  <textarea
                    rows={2}
                    value={panel.description}
                    onChange={(e) => set("description", e.target.value)}
                    placeholder="Bright room, shared kitchen, Wi-Fi included..."
                    className={fieldClass}
                  />
                </label>
              )}
              <div>
                <p className={labelClass}>{seeking ? "Amenities you need" : "Amenities included"}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {roommateAmenityFilters.map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => onToggleAmenity(filter)}
                      className={cn(
                        "min-h-9 rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                        amenities.includes(filter)
                          ? "border-emerald-400 bg-emerald-50 text-emerald-800"
                          : "border-slate-200 text-slate-600 hover:border-emerald-200",
                      )}
                    >
                      {filter}
                    </button>
                  ))} 
                </div>
              </div>
              {seeking ? (
                <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-3">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">You're OK with</p>
                  <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                    <label className="flex items-center gap-1.5">
                      <input type="checkbox" className="accent-emerald-700" checked={panel.smoking} onChange={(e) => set("smoking", e.target.checked)} />
                      Smoking
                    </label>
                    <label className="flex items-center gap-1.5">
                      <input type="checkbox" className="accent-emerald-700" checked={panel.pets} onChange={(e) => set("pets", e.target.checked)} />
                      Pets
                    </label>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Listing review</p>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-700">
                    <span className="rounded-xl bg-white px-3 py-2 ring-1 ring-emerald-100">{panel.location || "Location needed"}</span>
                    <span className="rounded-xl bg-white px-3 py-2 ring-1 ring-emerald-100">US${panel.budgetMax || "0"}/mo</span>
                    <span className="rounded-xl bg-white px-3 py-2 ring-1 ring-emerald-100">{roomPhotos.length} real photos</span>
                    <span className="rounded-xl bg-white px-3 py-2 ring-1 ring-emerald-100">{householdLabel(panel.householdType)}</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {error ? (
          <p className="mt-3 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
            {error}
          </p>
        ) : null}

        <div className="mt-4 flex items-center gap-2 pt-1">
          {step > 0 ? (
            <Button type="button" variant="secondary" className="h-11 flex-1 rounded-xl" onClick={goBack}>
              <ArrowLeft className="size-4" />
              Back
            </Button>
          ) : (
            <p className="hidden flex-1 text-xs font-semibold text-slate-500 sm:block">
              {seeking ? "Start with location and budget." : "Start with the room location."}
            </p>
          )}
          <Button
            type="button"
            onClick={goNext}
            className="h-12 flex-[1.4] rounded-xl bg-gradient-to-r from-emerald-700 to-teal-700 text-sm font-bold shadow-[0_12px_30px_rgba(4,120,87,0.22)] hover:from-emerald-800 hover:to-teal-800"
            disabled={submitting}
          >
            {isLastStep ? (
              seeking ? (
                <>
                  <Search className="size-4" />
                  {submitting ? "Searching..." : "Search rooms"}
                </>
              ) : (
                <>
                  <Home className="size-4" />
                  {submitting ? "Loading..." : "Post my room"}
                </>
              )
            ) : (
              <>
                Next
                <ArrowRight className="size-4" />
              </>
            )}
          </Button>
        </div>
      </div>
        </div>
      </div>
    </div>
  );
}

/** @deprecated Use RoomShareWizard */
export const MatchHeroCard = RoomShareWizard;
