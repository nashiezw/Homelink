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
      intent: type === "holiday_home" || type === "room" ? "rent" : current.intent,
      bedrooms: type === "room" || type === "land" || type === "commercial" ? "0" : current.bedrooms || "1",
      bathrooms: type === "room" || type === "land" ? "0" : current.bathrooms || "1",
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
    const nightlyRate = isHoliday ? Number(holidayHome.nightlyRate ?? form.price) : Number(form.price);

    const payload: Record<string, unknown> = {
      title: form.title.trim(),
      city: form.city.trim(),
      suburb: form.suburb.trim(),
      price: nightlyRate,
      type: form.type,
      intent: isHoliday ? "rent" : form.intent,
      bedrooms: ["room", "land", "commercial"].includes(form.type) ? 0 : Number(form.bedrooms) || 0,
      bathrooms: ["room", "land"].includes(form.type) ? 0 : Number(form.bathrooms) || 0,
      description: form.description.trim(),
      availableFrom: form.availableFrom,
      amenities,
      images,
      image: images[0],
      videos,
    };

    if (isHoliday) {
      payload.holidayHome = {
        ...holidayHome,
        nightlyRate,
        destination: holidayHome.destination ?? form.city.trim(),
      };
    }

    if (form.type === "room") {
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
    <form onSubmit={(e) => void submit(e)} className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
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

      {form.type !== "land" && form.type !== "commercial" && form.type !== "room" && (
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

      {form.type === "room" && (
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
