"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/components/providers/app-provider";
import { usePlatformConfig } from "@/components/providers/platform-config-provider";
import { Button } from "@/components/ui/button";
import { ImageUploader } from "@/components/ui/image-uploader";
import { VideoUploader } from "@/components/ui/video-uploader";
import { AvailabilityField } from "@/components/listings/availability-field";
import { HolidayHomeFields } from "@/components/holiday-homes/holiday-home-fields";
import { apiFetch } from "@/lib/api/client";
import { LocationPicker } from "@/components/listings/location-picker";
import { getAmenityOptions, getPropertyTypeOptions } from "@/lib/listings/taxonomy";
import type { HolidayHomeDetails } from "@/lib/holiday-homes/types";
import type { Listing, ListingIntent, PropertyType } from "@/lib/types";

const fieldClass =
  "mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 dark:border-slate-600 dark:bg-slate-900";

export function EditListingForm() {
  const params = useParams();
  const id = String(params.id ?? "");
  const router = useRouter();
  const { user, showToast } = useApp();
  const { config } = usePlatformConfig();
  const propertyTypes = useMemo(() => getPropertyTypeOptions(config), [config]);
  const amenityOptions = useMemo(() => getAmenityOptions(config), [config]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [videos, setVideos] = useState<string[]>([]);
  const [amenities, setAmenities] = useState<string[]>([]);
  const [holidayHome, setHolidayHome] = useState<Partial<HolidayHomeDetails>>({});
  const [form, setForm] = useState({
    title: "",
    province: "",
    city: "",
    suburb: "",
    price: "",
    type: "room" as PropertyType,
    intent: "rent" as ListingIntent,
    bedrooms: "0",
    bathrooms: "0",
    description: "",
    availableFrom: "",
    genderPreference: "any",
    schoolNearby: "",
    campusDistance: "",
    boardingGenderPolicy: "any",
    mealsIncluded: false,
    studyArea: false,
    billsIncluded: false,
    transportAccess: "",
    securityFeatures: "",
    curfew: "",
    houseRules: "",
  });

  useEffect(() => {
    void apiFetch<Listing>(`/api/v1/listings/${id}`).then((result) => {
      const listing = result.data;
      if (listing) {
        const province =
          config?.geo.find((p) => p.cities.some((c) => c.name === listing.city))?.name ??
          config?.geo[0]?.name ??
          "";
        setForm({
          title: listing.title,
          province,
          city: listing.city,
          suburb: listing.suburb,
          price: String(listing.price),
          type: listing.type,
          intent: listing.intent,
          bedrooms: String(listing.bedrooms),
          bathrooms: String(listing.bathrooms),
          description: listing.description,
          availableFrom: listing.availableFrom,
          genderPreference: listing.tenantPreferences?.genderPreference ?? "any",
          schoolNearby: listing.listingDetails?.schoolNearby ?? "",
          campusDistance: listing.listingDetails?.campusDistance ?? "",
          boardingGenderPolicy: listing.listingDetails?.boardingGenderPolicy ?? "any",
          mealsIncluded: Boolean(listing.listingDetails?.mealsIncluded || listing.description.match(/\bmeals included\b/i)),
          studyArea: Boolean(listing.listingDetails?.studyArea || listing.description.match(/\bstudy area\b/i)),
          billsIncluded: Boolean(listing.listingDetails?.billsIncluded || listing.description.match(/\bbills included\b/i)),
          transportAccess: listing.listingDetails?.transportAccess ?? "",
          securityFeatures: listing.listingDetails?.securityFeatures ?? "",
          curfew: listing.listingDetails?.curfew ?? "",
          houseRules: listing.listingDetails?.houseRules ?? "",
        });
        setImages(listing.images?.length ? listing.images : listing.image ? [listing.image] : []);
        setVideos(listing.videos ?? []);
        setAmenities(listing.amenities ?? []);
        if (listing.holidayHome) {
          setHolidayHome(listing.holidayHome);
        }
      }
      setLoading(false);
    });
  }, [id, config?.geo]);
  function toggleAmenity(label: string) {
    setAmenities((current) =>
      current.includes(label) ? current.filter((a) => a !== label) : [...current, label],
    );
  }

  function updateType(type: PropertyType) {
    setForm((current) => ({
      ...current,
      type,
      intent: type === "holiday_home" || type === "room" || type === "boarding_house" ? "rent" : current.intent,
      bedrooms: type === "room" || type === "boarding_house" || type === "land" || type === "commercial" ? "0" : current.bedrooms || "1",
      bathrooms: type === "room" || type === "boarding_house" || type === "land" ? "0" : current.bathrooms || "1",
    }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      router.push(`/auth?next=/dashboard/landlord/listings/${id}/edit`);
      return;
    }
    setSaving(true);

    const isHoliday = form.type === "holiday_home";
    const isBoardingHouse = form.type === "boarding_house";
    const nightlyRate = isHoliday ? Number(holidayHome.nightlyRate ?? form.price) : Number(form.price);
    const description = form.description.trim();
    const boardingSummary = boardingDetailsSummary(form);
    const publicDescription = isBoardingHouse
      ? [stripBoardingSummary(description), boardingSummary].filter(Boolean).join("\n\n")
      : description;
    const submittedAmenities = isBoardingHouse
      ? [...new Set([...amenities, ...boardingAmenities(form)])]
      : amenities;

    const payload: Record<string, unknown> = {
      title: form.title.trim(),
      city: form.city.trim(),
      suburb: form.suburb.trim(),
      price: nightlyRate,
      type: form.type,
      intent: isHoliday ? "rent" : form.intent,
      bedrooms: ["room", "boarding_house", "land", "commercial"].includes(form.type) ? 0 : Number(form.bedrooms) || 0,
      bathrooms: ["room", "boarding_house", "land"].includes(form.type) ? 0 : Number(form.bathrooms) || 0,
      description: publicDescription,
      availableFrom: form.availableFrom,
      amenities: submittedAmenities,
      images,
      image: images[0],
      videos,
      listingDetails: isBoardingHouse
        ? {
            schoolNearby: form.schoolNearby.trim() || undefined,
            campusDistance: form.campusDistance.trim() || undefined,
            boardingGenderPolicy: form.boardingGenderPolicy,
            mealsIncluded: form.mealsIncluded,
            studyArea: form.studyArea,
            billsIncluded: form.billsIncluded,
            transportAccess: form.transportAccess.trim() || undefined,
            securityFeatures: form.securityFeatures.trim() || undefined,
            curfew: form.curfew.trim() || undefined,
            houseRules: form.houseRules.trim() || undefined,
          }
        : undefined,
    };

    if (isHoliday) {
      payload.holidayHome = {
        ...holidayHome,
        nightlyRate,
        destination: holidayHome.destination ?? form.city.trim(),
      };
    }

    if (form.type === "room" || form.type === "boarding_house") {
      payload.tenantPreferences = {
        genderPreference: form.genderPreference,
        maxOccupants: 1,
        acceptedHouseholdTypes: ["single"],
        acceptedMaritalStatuses: ["single", "married"],
      };
    }

    const result = await apiFetch(`/api/v1/listings/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });

    setSaving(false);

    if (result.error) {
      showToast(result.error.message ?? "Could not update listing.", "error");
      return;
    }

    showToast("Listing updated.");
    router.push(`/listings/${id}`);
  }

  if (loading) {
    return <div className="rounded-xl border bg-white p-8 text-center text-slate-500">Loading...</div>;
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="max-w-full space-y-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Edit listing</h2>
        <Link href={`/listings/${id}`} className="text-sm font-medium text-emerald-700 hover:underline">
          View live listing
        </Link>
      </div>

      <ImageUploader value={images} onChange={setImages} max={10} folder="listings" label="Photos" />
      <VideoUploader value={videos} onChange={setVideos} max={2} folder="listings" />

      <label className="block text-sm font-medium">
        Title
        <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={fieldClass} />
      </label>

      <LocationPicker
        province={form.province}
        city={form.city}
        suburb={form.suburb}
        onChange={({ province, city, suburb }) => setForm({ ...form, province, city, suburb })}
      />

      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        <label className="block text-sm font-medium">
          Listing type
          <select
            value={form.type}
            onChange={(e) => updateType(e.target.value as PropertyType)}
            className={fieldClass}
          >
            {propertyTypes.map((t) => (              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium">
          Intent
          <select
            value={form.intent}
            onChange={(e) => setForm({ ...form, intent: e.target.value as ListingIntent })}
            disabled={form.type === "holiday_home"}
            className={fieldClass}
          >
            <option value="rent">For rent</option>
            <option value="buy">For sale</option>
          </select>
        </label>
        <label className="block text-sm font-medium">
          {form.type === "holiday_home" ? "Nightly rate (USD)" : "Price (USD/month)"}
          <input
            required
            type="number"
            min={1}
            value={form.type === "holiday_home" ? (holidayHome.nightlyRate ?? form.price) : form.price}
            onChange={(e) => {
              const val = e.target.value;
              if (form.type === "holiday_home") {
                setHolidayHome({ ...holidayHome, nightlyRate: Number(val) });
                setForm({ ...form, price: val });
              } else {
                setForm({ ...form, price: val });
              }
            }}
            className={fieldClass}
          />
        </label>
      </div>

      {form.type === "holiday_home" ? (
        <HolidayHomeFields value={holidayHome} onChange={setHolidayHome} />
      ) : null}

      {form.type !== "land" && form.type !== "commercial" && form.type !== "room" && form.type !== "boarding_house" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium">
            Bedrooms
            <input
              type="number"
              min={0}
              value={form.bedrooms}
              onChange={(e) => setForm({ ...form, bedrooms: e.target.value })}
              className={fieldClass}
            />
          </label>
          <label className="block text-sm font-medium">
            Bathrooms
            <input
              type="number"
              min={0}
              value={form.bathrooms}
              onChange={(e) => setForm({ ...form, bathrooms: e.target.value })}
              className={fieldClass}
            />
          </label>
        </div>
      )}

      <AvailabilityField
        value={form.availableFrom}
        intent={form.intent}
        onChange={(availableFrom) => setForm({ ...form, availableFrom })}
      />

      {(form.type === "room" || form.type === "boarding_house") && (
        <section className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium">
              Preferred tenant gender
              <select
                value={form.genderPreference}
                onChange={(e) => setForm({ ...form, genderPreference: e.target.value })}
                className={fieldClass}
              >
                <option value="any">Any</option>
                <option value="female">Female only</option>
                <option value="male">Male only</option>
              </select>
            </label>
            {form.type === "boarding_house" && (
              <>
                <label className="block text-sm font-medium">
                  School, college, or campus nearby
                  <input value={form.schoolNearby} onChange={(e) => setForm({ ...form, schoolNearby: e.target.value })} placeholder="NUST, UZ, MSU, local school..." className={fieldClass} />
                </label>
                <label className="block text-sm font-medium">
                  Distance or travel time to campus
                  <input value={form.campusDistance} onChange={(e) => setForm({ ...form, campusDistance: e.target.value })} placeholder="10 min walk, 2 km, one kombi..." className={fieldClass} />
                </label>
                <label className="block text-sm font-medium">
                  Boarding policy
                  <select value={form.boardingGenderPolicy} onChange={(e) => setForm({ ...form, boardingGenderPolicy: e.target.value })} className={fieldClass}>
                    <option value="any">Open to all students</option>
                    <option value="female">Female students only</option>
                    <option value="male">Male students only</option>
                    <option value="separate_wings">Separate male and female wings</option>
                  </select>
                </label>
                <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={form.mealsIncluded} onChange={(e) => setForm({ ...form, mealsIncluded: e.target.checked })} /> Meals included</label>
                <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={form.studyArea} onChange={(e) => setForm({ ...form, studyArea: e.target.checked })} /> Study area available</label>
                <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={form.billsIncluded} onChange={(e) => setForm({ ...form, billsIncluded: e.target.checked })} /> Bills included</label>
                <label className="block text-sm font-medium">
                  Transport access
                  <input value={form.transportAccess} onChange={(e) => setForm({ ...form, transportAccess: e.target.value })} placeholder="Kombi route, school shuttle, walking distance..." className={fieldClass} />
                </label>
                <label className="block text-sm font-medium">
                  Security features
                  <input value={form.securityFeatures} onChange={(e) => setForm({ ...form, securityFeatures: e.target.value })} placeholder="Walled, gate, caretaker, lighting..." className={fieldClass} />
                </label>
                <label className="block text-sm font-medium">
                  Curfew
                  <input value={form.curfew} onChange={(e) => setForm({ ...form, curfew: e.target.value })} placeholder="No curfew, 9pm, flexible with notice..." className={fieldClass} />
                </label>
                <label className="block text-sm font-medium sm:col-span-2">
                  House rules
                  <input value={form.houseRules} onChange={(e) => setForm({ ...form, houseRules: e.target.value })} placeholder="Visitors, noise, chores, alcohol, laundry, study hours..." className={fieldClass} />
                </label>
              </>
            )}
          </div>
        </section>
      )}

      <label className="block text-sm font-medium">
        Description
        <textarea required rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={fieldClass} />
      </label>

      <div>
        <p className="text-sm font-medium">Amenities</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {amenityOptions.map((label) => (            <button
              key={label}
              type="button"
              onClick={() => toggleAmenity(label)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                amenities.includes(label)
                  ? "border-emerald-400 bg-emerald-50 text-emerald-800"
                  : "border-slate-200 text-slate-600 hover:border-emerald-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save changes"}</Button>
        <Button type="button" variant="secondary" onClick={() => router.push("/dashboard/landlord")}>Cancel</Button>
      </div>
    </form>
  );
}

function boardingDetailsSummary(form: {
  schoolNearby: string;
  campusDistance: string;
  boardingGenderPolicy: string;
  mealsIncluded: boolean;
  studyArea: boolean;
  billsIncluded: boolean;
  transportAccess: string;
  securityFeatures: string;
  curfew: string;
  houseRules: string;
}) {
  const details = ["Student accommodation / boarding house."];
  if (form.schoolNearby.trim()) details.push(`Near: ${form.schoolNearby.trim()}.`);
  if (form.campusDistance.trim()) details.push(`Campus access: ${form.campusDistance.trim()}.`);
  if (form.boardingGenderPolicy !== "any") details.push(`Boarding policy: ${form.boardingGenderPolicy.replace(/_/g, " ")}.`);
  if (form.mealsIncluded) details.push("Meals included.");
  if (form.studyArea) details.push("Study area available.");
  if (form.billsIncluded) details.push("Bills included.");
  if (form.transportAccess.trim()) details.push(`Transport: ${form.transportAccess.trim()}.`);
  if (form.securityFeatures.trim()) details.push(`Security: ${form.securityFeatures.trim()}.`);
  if (form.curfew.trim()) details.push(`Curfew: ${form.curfew.trim()}.`);
  if (form.houseRules.trim()) details.push(`House rules: ${form.houseRules.trim()}.`);
  return details.join(" ");
}

function boardingAmenities(form: {
  schoolNearby: string;
  campusDistance: string;
  mealsIncluded: boolean;
  studyArea: boolean;
  billsIncluded: boolean;
  transportAccess: string;
  securityFeatures: string;
}) {
  return [
    "Student accommodation",
    "Boarding house",
    form.schoolNearby.trim() ? "Near campus" : "",
    form.campusDistance.trim() ? "Campus access" : "",
    form.mealsIncluded ? "Meals included" : "",
    form.studyArea ? "Study area" : "",
    form.billsIncluded ? "Bills included" : "",
    form.transportAccess.trim() ? "Transport access" : "",
    form.securityFeatures.trim() ? "Security" : "",
  ].filter(Boolean);
}

function stripBoardingSummary(description: string) {
  return description
    .replace(/\n\nStudent accommodation \/ boarding house\.[\s\S]*$/i, "")
    .replace(/Student accommodation \/ boarding house\.[\s\S]*$/i, "")
    .trim();
}
