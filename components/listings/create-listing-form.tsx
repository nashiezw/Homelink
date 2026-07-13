"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/components/providers/app-provider";
import { usePlatformConfig } from "@/components/providers/platform-config-provider";
import { Button } from "@/components/ui/button";
import { ImageUploader } from "@/components/ui/image-uploader";
import { VideoUploader } from "@/components/ui/video-uploader";
import { VisualSignaturePad } from "@/components/signatures/visual-signature-pad";
import { apiFetch } from "@/lib/api/client";
import { AvailabilityField } from "@/components/listings/availability-field";
import { HolidayHomeFields } from "@/components/holiday-homes/holiday-home-fields";
import { LocationPicker, resolveInitialLocation } from "@/components/listings/location-picker";
import { getAmenityOptions, getPropertyTypeOptions } from "@/lib/listings/taxonomy";
import type { HolidayHomeDetails } from "@/lib/holiday-homes/types";
import { HOUSEHOLD_OPTIONS, householdOccupants, type HouseholdType, type MaritalStatus } from "@/lib/roommates/types";
import type { ListingIntent, PropertyType } from "@/lib/types";
import {
  HOMELINK_OWNER_LISTING_AGREEMENT,
  OWNER_LISTING_AGREEMENT_VERSION,
} from "@/lib/listings/owner-contract";
const fieldClass =
  "mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 dark:border-slate-600 dark:bg-slate-900";
const checkboxClass = "size-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600";

type CreateListingFormProps = {
  onSuccess?: (listingId: string) => void;
};

export function CreateListingForm({ onSuccess }: CreateListingFormProps) {
  const router = useRouter();
  const { user, showToast } = useApp();
  const { config } = usePlatformConfig();
  const initialLocation = useMemo(() => resolveInitialLocation(config?.geo ?? []), [config?.geo]);
  const propertyTypes = useMemo(() => getPropertyTypeOptions(config), [config]);
  const amenityOptions = useMemo(() => getAmenityOptions(config), [config]);
  const isAgent = Boolean(user?.roles?.includes("AGENT"));
  const [submitting, setSubmitting] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [videos, setVideos] = useState<string[]>([]);
  const [amenities, setAmenities] = useState<string[]>([]);
  const [ownerSignatureImage, setOwnerSignatureImage] = useState("");
  const [holidayHome, setHolidayHome] = useState<Partial<HolidayHomeDetails>>({
    minimumStay: 2,
    maximumGuests: 4,
    checkInTime: "14:00",
    checkOutTime: "10:00",
    wifiAvailable: true,
    kitchen: true,
    parking: true,
  });
  const [form, setForm] = useState({
    title: "",
    province: initialLocation.province,
    city: initialLocation.city,
    suburb: initialLocation.suburb,
    price: "",
    type: "room" as PropertyType,
    intent: "rent" as ListingIntent,
    bedrooms: "0",
    bathrooms: "0",
    description: "",
    availableFrom: "Available now",
    genderPreference: "any",
    maxOccupants: "1",
    acceptedHouseholdType: "single" as HouseholdType,
    acceptedMaritalStatus: "any" as MaritalStatus | "any",
    depositAmount: "",
    leaseTerm: "12 months",
    utilitiesIncluded: false,
    sharedBathroom: true,
    kitchenAccess: true,
    childrenAllowed: false,
    smokingAllowed: false,
    petsAllowed: false,
    parkingSpaces: "0",
    floorAreaSqm: "",
    landSizeSqm: "",
    zoning: "",
    roadAccess: "",
    waterSource: "",
    powerAvailable: false,
    commercialUse: "",
    leadSource: "HOMELINK" as "HOMELINK" | "AGENT",
    propertyOwnerName: "",
    propertyOwnerEmail: "",
    propertyOwnerPhone: "",
    ownerAgreementAccepted: false,
    ownerAgreementSignerName: "",
  });

  useEffect(() => {
    if (!config?.geo.length) return;
    setForm((current) => {
      if (current.suburb) return current;
      const initial = resolveInitialLocation(config.geo);
      return { ...current, province: initial.province, city: initial.city, suburb: initial.suburb };
    });
  }, [config?.geo]);

  useEffect(() => {
    if (!user || isAgent) return;
    setForm((current) =>
      current.ownerAgreementSignerName
        ? current
        : { ...current, ownerAgreementSignerName: user.name, ownerAgreementAccepted: current.ownerAgreementAccepted },
    );
  }, [user, isAgent]);

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
      availableFrom: type === "land" && current.intent === "buy" ? "Available now" : current.availableFrom,
    }));
  }

  function priceLabel() {
    if (form.type === "holiday_home") return "Nightly rate (USD) *";
    if (form.intent === "buy") return "Sale price (USD) *";
    if (form.type === "commercial") return "Rent / asking price (USD) *";
    return "Monthly rent (USD) *";
  }

  function validate() {
    if (images.length === 0) return "Add at least one real property photo before submitting.";
    if (!form.city.trim() || !form.suburb.trim()) return "Choose the city and suburb.";
    if (!Number(form.price) && form.type !== "holiday_home") return "Add a valid price.";
    if (form.type === "land" && !form.landSizeSqm.trim()) return "Add the land size in square metres.";
    if (form.type === "commercial" && !form.floorAreaSqm.trim()) return "Add the floor area for the commercial space.";
    if (form.type === "room" && Number(form.maxOccupants) < householdOccupants(form.acceptedHouseholdType)) {
      return "Max occupants must fit the household size you accept.";
    }
    if (!form.ownerAgreementAccepted) return "The property owner must accept the HomeLink listing agreement.";
    if (!form.ownerAgreementSignerName.trim()) return "Enter the property owner's full name as electronic signature.";
    if (!ownerSignatureImage) return "Draw the property owner's visual signature.";
    return "";
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      showToast("Sign in as a landlord to list property.", "info");
      router.push("/auth?next=/dashboard/landlord/new");
      return;
    }

    const validationError = validate();
    if (validationError) {
      showToast(validationError, "error");
      return;
    }

    setSubmitting(true);
    const isHoliday = form.type === "holiday_home";
    const nightlyRate = isHoliday ? Number(holidayHome.nightlyRate ?? form.price) : Number(form.price);

    const payload: Record<string, unknown> = {
      title: form.title.trim(),
      city: form.city.trim(),
      suburb: form.suburb.trim(),
      price: nightlyRate,
      type: form.type,
      intent: isHoliday ? "rent" : form.intent,
      bedrooms: ["room", "land", "commercial"].includes(form.type) ? 0 : Number(form.bedrooms) || 1,
      bathrooms: ["room", "land"].includes(form.type) ? 0 : Number(form.bathrooms) || 1,
      description: form.description.trim(),
      availableFrom: form.availableFrom.trim() || "Available now",
      amenities,
      images: images.length ? images : undefined,
      image: images[0],
      videos: videos.length ? videos : undefined,
      leadSource: isAgent ? form.leadSource : undefined,
      propertyOwnerName: form.propertyOwnerName.trim() || undefined,
      propertyOwnerEmail: form.propertyOwnerEmail.trim() || undefined,
      propertyOwnerPhone: form.propertyOwnerPhone.trim() || undefined,
      ownerAgreementAccepted: form.ownerAgreementAccepted,
      ownerAgreementSignerName: form.ownerAgreementSignerName.trim(),
      ownerAgreementVersion: OWNER_LISTING_AGREEMENT_VERSION,
      ownerAgreementSignedAt: new Date().toISOString(),
      ownerAgreementSignatureImage: ownerSignatureImage,
      listingDetails: {
        priceBasis: isHoliday ? "nightly" : form.intent === "buy" ? "total" : "monthly",
        depositAmount: Number(form.depositAmount) || undefined,
        leaseTerm: form.intent === "rent" ? form.leaseTerm : undefined,
        utilitiesIncluded: form.utilitiesIncluded,
        sharedBathroom: form.type === "room" ? form.sharedBathroom : undefined,
        kitchenAccess: form.type === "room" ? form.kitchenAccess : undefined,
        childrenAllowed: form.childrenAllowed,
        smokingAllowed: form.smokingAllowed,
        petsAllowed: form.petsAllowed,
        parkingSpaces: Number(form.parkingSpaces) || 0,
        floorAreaSqm: Number(form.floorAreaSqm) || undefined,
        landSizeSqm: Number(form.landSizeSqm) || undefined,
        zoning: form.zoning.trim() || undefined,
        roadAccess: form.roadAccess.trim() || undefined,
        waterSource: form.waterSource.trim() || undefined,
        powerAvailable: form.powerAvailable,
        commercialUse: form.commercialUse.trim() || undefined,
      },
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
        genderPreference: form.acceptedHouseholdType === "single" ? form.genderPreference : "any",
        maxOccupants: Number(form.maxOccupants) || householdOccupants(form.acceptedHouseholdType),
        acceptedHouseholdTypes: [form.acceptedHouseholdType],
        acceptedMaritalStatuses: form.acceptedMaritalStatus === "any" ? ["single", "married", "partnered"] : [form.acceptedMaritalStatus],
      };
    }

    try {
      const result = await apiFetch<{ id: string; slug?: string }>("/api/v1/listings", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (result.error) {
        showToast(result.error.message, "error");
        return;
      }

      if (result.data?.id) {
        showToast("Listing submitted for review!");
        onSuccess?.(result.data.id);
        router.push(`/listings/${result.data.slug ?? result.data.id}`);
      } else {
        showToast("The listing was not saved. Please try again.", "error");
      }
    } catch (error) {
      console.error("Listing submission failed", error);
      showToast("The listing could not be submitted. Check your connection and try again.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="max-w-full space-y-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 dark:border-slate-700 dark:bg-slate-900">
      <div>
        <h2 className="text-lg font-semibold text-ink">Listing details</h2>
        <p className="mt-1 text-sm text-slate-500">
          The questions change by listing type so seekers see the right price, photos, rules, and fit.
        </p>
      </div>

      <ImageUploader value={images} onChange={setImages} max={8} folder="listings" label="Property photos" />
      <VideoUploader value={videos} onChange={setVideos} max={2} folder="listings" />

      {isAgent ? (
        <section className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-ink">Lead ownership</p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                Choose who generated this owner relationship. Agent-sourced owners are checked against HomeLink records before ownership is confirmed.
              </p>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-700 shadow-sm dark:bg-slate-900">
              Admin audited
            </span>
          </div>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium">
              Lead source *
              <select
                value={form.leadSource}
                onChange={(e) => setForm({ ...form, leadSource: e.target.value as "HOMELINK" | "AGENT" })}
                className={fieldClass}
              >
                <option value="HOMELINK">HomeLink generated lead</option>
                <option value="AGENT">Agent generated lead</option>
              </select>
            </label>
            <label className="block text-sm font-medium">
              Property owner name
              <input value={form.propertyOwnerName} onChange={(e) => setForm({ ...form, propertyOwnerName: e.target.value })} className={fieldClass} />
            </label>
            <label className="block text-sm font-medium">
              Property owner email
              <input type="email" value={form.propertyOwnerEmail} onChange={(e) => setForm({ ...form, propertyOwnerEmail: e.target.value })} className={fieldClass} />
            </label>
            <label className="block text-sm font-medium">
              Property owner phone
              <input value={form.propertyOwnerPhone} onChange={(e) => setForm({ ...form, propertyOwnerPhone: e.target.value })} className={fieldClass} />
            </label>
          </div>
        </section>
      ) : null}

      <label className="block text-sm font-medium">
        Title *
        <input
          required
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="e.g. Furnished room in Avondale"
          className={fieldClass}
        />
      </label>

      <LocationPicker
        province={form.province}
        city={form.city}
        suburb={form.suburb}
        onChange={({ province, city, suburb }) => setForm({ ...form, province, city, suburb })}
      />

      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        <label className="block text-sm font-medium">
          Listing type *
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
          Intent *
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
          {priceLabel()}
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

      {form.type !== "land" && form.type !== "room" && (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {form.type !== "commercial" && (
            <label className="block text-sm font-medium">
              Bedrooms
              <input type="number" min={0} value={form.bedrooms} onChange={(e) => setForm({ ...form, bedrooms: e.target.value })} className={fieldClass} />
            </label>
          )}
          <label className="block text-sm font-medium">
            Bathrooms
            <input type="number" min={0} value={form.bathrooms} onChange={(e) => setForm({ ...form, bathrooms: e.target.value })} className={fieldClass} />
          </label>
          <label className="block text-sm font-medium">
            Parking spaces
            <input type="number" min={0} value={form.parkingSpaces} onChange={(e) => setForm({ ...form, parkingSpaces: e.target.value })} className={fieldClass} />
          </label>
        </div>
      )}

      {form.type === "land" && (
        <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/40">
          <p className="text-sm font-semibold text-ink">Land details</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium">Land size (sqm) *<input value={form.landSizeSqm} onChange={(e) => setForm({ ...form, landSizeSqm: e.target.value })} type="number" min={1} className={fieldClass} /></label>
            <label className="block text-sm font-medium">Zoning / permitted use<input value={form.zoning} onChange={(e) => setForm({ ...form, zoning: e.target.value })} placeholder="Residential, commercial, agricultural..." className={fieldClass} /></label>
            <label className="block text-sm font-medium">Road access<input value={form.roadAccess} onChange={(e) => setForm({ ...form, roadAccess: e.target.value })} placeholder="Tarred road, gravel, servitude..." className={fieldClass} /></label>
            <label className="block text-sm font-medium">Water source<input value={form.waterSource} onChange={(e) => setForm({ ...form, waterSource: e.target.value })} placeholder="Municipal, borehole, none..." className={fieldClass} /></label>
            <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" className={checkboxClass} checked={form.powerAvailable} onChange={(e) => setForm({ ...form, powerAvailable: e.target.checked })} /> ZESA / power available nearby</label>
          </div>
        </section>
      )}

      {form.type === "commercial" && (
        <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/40">
          <p className="text-sm font-semibold text-ink">Commercial details</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium">Floor area (sqm) *<input value={form.floorAreaSqm} onChange={(e) => setForm({ ...form, floorAreaSqm: e.target.value })} type="number" min={1} className={fieldClass} /></label>
            <label className="block text-sm font-medium">Best use<input value={form.commercialUse} onChange={(e) => setForm({ ...form, commercialUse: e.target.value })} placeholder="Office, shop, warehouse, restaurant..." className={fieldClass} /></label>
          </div>
        </section>
      )}

      <AvailabilityField
        value={form.availableFrom}
        intent={form.intent}
        onChange={(availableFrom) => setForm({ ...form, availableFrom })}
      />

      {form.type === "room" && (
        <section className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
          <p className="text-sm font-semibold text-ink">Room-sharing fit</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium">
              Household size accepted
              <select value={form.acceptedHouseholdType} onChange={(e) => setForm({ ...form, acceptedHouseholdType: e.target.value as HouseholdType, genderPreference: e.target.value === "single" ? form.genderPreference : "any", maxOccupants: String(householdOccupants(e.target.value as HouseholdType)) })} className={fieldClass}>
                {HOUSEHOLD_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="block text-sm font-medium">
              Max occupants
              <input type="number" min={1} value={form.maxOccupants} onChange={(e) => setForm({ ...form, maxOccupants: e.target.value })} className={fieldClass} />
            </label>
            {form.acceptedHouseholdType === "single" && (
              <label className="block text-sm font-medium">
                Preferred tenant gender
                <select value={form.genderPreference} onChange={(e) => setForm({ ...form, genderPreference: e.target.value })} className={fieldClass}>
                  <option value="any">Any</option>
                  <option value="female">Female only</option>
                  <option value="male">Male only</option>
                </select>
              </label>
            )}
            <label className="block text-sm font-medium">
              Marital status accepted
              <select value={form.acceptedMaritalStatus} onChange={(e) => setForm({ ...form, acceptedMaritalStatus: e.target.value as MaritalStatus | "any" })} className={fieldClass}>
                <option value="any">Any suitable tenant</option>
                <option value="single">Single</option>
                <option value="married">Married</option>
                <option value="partnered">Partnered</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" className={checkboxClass} checked={form.sharedBathroom} onChange={(e) => setForm({ ...form, sharedBathroom: e.target.checked })} /> Shared bathroom</label>
            <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" className={checkboxClass} checked={form.kitchenAccess} onChange={(e) => setForm({ ...form, kitchenAccess: e.target.checked })} /> Kitchen access</label>
          </div>
        </section>
      )}

      {form.intent === "rent" && form.type !== "holiday_home" && (
        <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/40">
          <p className="text-sm font-semibold text-ink">Rental terms and house rules</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            <label className="block text-sm font-medium">Deposit (USD)<input type="number" min={0} value={form.depositAmount} onChange={(e) => setForm({ ...form, depositAmount: e.target.value })} className={fieldClass} /></label>
            <label className="block text-sm font-medium">Minimum lease<select value={form.leaseTerm} onChange={(e) => setForm({ ...form, leaseTerm: e.target.value })} className={fieldClass}><option>Month to month</option><option>3 months</option><option>6 months</option><option>12 months</option></select></label>
            <label className="flex items-center gap-2 text-sm font-medium sm:pt-8"><input type="checkbox" className={checkboxClass} checked={form.utilitiesIncluded} onChange={(e) => setForm({ ...form, utilitiesIncluded: e.target.checked })} /> Utilities included</label>
            <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" className={checkboxClass} checked={form.childrenAllowed} onChange={(e) => setForm({ ...form, childrenAllowed: e.target.checked })} /> Children allowed</label>
            <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" className={checkboxClass} checked={form.petsAllowed} onChange={(e) => setForm({ ...form, petsAllowed: e.target.checked })} /> Pets allowed</label>
            <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" className={checkboxClass} checked={form.smokingAllowed} onChange={(e) => setForm({ ...form, smokingAllowed: e.target.checked })} /> Smoking allowed</label>
          </div>
        </section>
      )}

      <label className="block text-sm font-medium">
        Description *
        <textarea
          required
          rows={4}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Describe the property, house rules, and what's included..."
          className={fieldClass}
        />
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

      <section className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
        <p className="text-sm font-semibold text-ink">Property owner agreement</p>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
          {isAgent
            ? "The property owner must authorise HomeLink to market this property and route all client contact and payments through the platform."
            : "By signing, you authorise HomeLink to market this property and route enquiries, viewings, and payments through the platform."}
        </p>
        <div className="mt-3 max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-white p-4 text-sm leading-relaxed whitespace-pre-wrap dark:border-slate-700 dark:bg-slate-900">
          {HOMELINK_OWNER_LISTING_AGREEMENT}
        </div>
        <label className="mt-3 flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.ownerAgreementAccepted}
            onChange={(e) => setForm({ ...form, ownerAgreementAccepted: e.target.checked })}
            className={checkboxClass}
          />
          I confirm the property owner accepts the HomeLink listing agreement.
        </label>
        <label className="mt-3 block text-sm font-medium">
          Owner electronic signature (full legal name)
          <input
            value={form.ownerAgreementSignerName}
            onChange={(e) =>
              setForm({
                ...form,
                ownerAgreementSignerName: e.target.value,
                propertyOwnerName: isAgent ? form.propertyOwnerName : e.target.value,
              })
            }
            placeholder={isAgent ? form.propertyOwnerName || "Property owner full name" : user?.name ?? "Your full name"}
            className={fieldClass}
          />
        </label>
        <div className="mt-3">
          <p className="mb-2 text-sm font-medium">Owner visual signature</p>
          <VisualSignaturePad value={ownerSignatureImage} onChange={setOwnerSignatureImage} />
        </div>
      </section>

      <div className="flex flex-wrap gap-3 pt-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Submitting..." : "Submit listing"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.push("/dashboard/landlord")}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
