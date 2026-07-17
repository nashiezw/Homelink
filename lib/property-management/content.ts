import type { LucideIcon } from "lucide-react";
import {
  BadgeCheck,
  FileText,
  Headphones,
  KeyRound,
  Search,
  ShieldCheck,
  Users,
  Wrench,
} from "lucide-react";

export const pmHeroTrustItems = [
  { icon: BadgeCheck, label: "Verified tenants" },
  { icon: KeyRound, label: "Rent collection on time" },
  { icon: Wrench, label: "Maintenance handled" },
  { icon: FileText, label: "Monthly reports & transparency" },
] as const;

export const pmHeroStats = [
  { value: "2,998+", label: "Properties managed" },
  { value: "92%", label: "Tenant retention rate" },
  { value: "24h", label: "Issue response time" },
  { value: "$15M+", label: "Rent secured monthly" },
] as const;

export const pmServices: Array<{ icon: LucideIcon; title: string; body: string }> = [
  {
    icon: Users,
    title: "Tenant Sourcing & Screening",
    body: "We advertise, screen applicants, and place reliable tenants in your property.",
  },
  {
    icon: KeyRound,
    title: "Rent Collection",
    body: "On-time rent collection with reminders, receipts, and owner payouts.",
  },
  {
    icon: Search,
    title: "Property Inspections",
    body: "Regular inspections with photo reports so you always know property condition.",
  },
  {
    icon: Wrench,
    title: "Maintenance & Repairs",
    body: "Trusted contractors handle repairs quickly - we coordinate everything.",
  },
  {
    icon: FileText,
    title: "Financial Reporting",
    body: "Clear monthly statements showing income, expenses, and net returns.",
  },
  {
    icon: ShieldCheck,
    title: "Legal & Compliance",
    body: "Lease agreements, notices, and compliance handled by our expert team.",
  },
];

export const pmProcessSteps = [
  { step: 1, title: "Submit Property Details", body: "Tell us about your property and management needs." },
  { step: 2, title: "We Find the Right Tenants", body: "Marketing, screening, and shortlisting qualified applicants." },
  { step: 3, title: "You Approve, We Manage", body: "You choose the tenant - we handle the rest." },
  { step: 4, title: "We Handle Everything", body: "Rent, maintenance, inspections, and reporting." },
  { step: 5, title: "You Get Peace of Mind", body: "Consistent income with zero day-to-day stress." },
] as const;

export const pmPricingPlans = [
  {
    id: "basic",
    name: "Basic",
    rate: "8%",
    description: "Essential management for hands-on owners.",
    popular: false,
    features: [
      "Tenant placement",
      "Rent collection",
      "Basic maintenance coordination",
      "Monthly statement",
    ],
  },
  {
    id: "standard",
    name: "Standard",
    rate: "10%",
    description: "Our most popular plan for busy property owners.",
    popular: true,
    features: [
      "Everything in Basic",
      "Quarterly inspections",
      "24h maintenance response",
      "Tenant screening & references",
      "Legal lease support",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    rate: "12%",
    description: "Full-service management with premium support.",
    popular: false,
    features: [
      "Everything in Standard",
      "Dedicated account manager",
      "Priority maintenance",
      "Vacancy marketing boost",
      "Annual property valuation",
    ],
  },
] as const;

export const pmTestimonials = [
  {
    id: "t1",
    quote: "HouseLink found great tenants within two weeks. Rent has been on time every month.",
    name: "Tendai M.",
    location: "Harare",
    image: "/images/roommates/portrait-tendai.jpg",
    rating: 5,
  },
  {
    id: "t2",
    quote: "I live abroad and finally have peace of mind. The monthly reports are detailed and clear.",
    name: "Rudo K.",
    location: "Bulawayo",
    image: "/images/roommates/portrait-rudo.jpg",
    rating: 5,
  },
  {
    id: "t3",
    quote: "Maintenance issues used to stress me out. Now they handle everything within 24 hours.",
    name: "Farai N.",
    location: "Gweru",
    image: "/images/roommates/portrait-farai.jpg",
    rating: 5,
  },
  {
    id: "t4",
    quote: "Professional team, transparent fees, and tenants who actually stay. Highly recommend.",
    name: "Chipo S.",
    location: "Mutare",
    image: "/images/roommates/portrait-chipo.jpg",
    rating: 5,
  },
] as const;

export const pmFaqs = [
  {
    question: "How much does property management cost?",
    answer:
      "Plans start at 8% of monthly rent for Basic management. Standard (10%) is our most popular plan and Premium (12%) includes dedicated support. No hidden fees.",
  },
  {
    question: "How quickly can you find tenants?",
    answer:
      "Most properties receive qualified applicants within 7-14 days depending on location, price, and property condition. We market across HouseLink and partner channels.",
  },
  {
    question: "Do I need to be in Zimbabwe?",
    answer:
      "No. Our diaspora service is built for owners abroad. You receive digital reports, approve tenants remotely, and get paid via your preferred method.",
  },
  {
    question: "What happens if a tenant doesn't pay rent?",
    answer:
      "We follow a structured process: reminders, formal notices, and legal escalation if needed. Premium plans include additional rent-guarantee options.",
  },
  {
    question: "Can I switch plans later?",
    answer:
      "Yes. You can upgrade or downgrade your plan with 30 days' notice. We'll align services to your property's needs as they change.",
  },
] as const;

export const pmHelpOptions = [
  { id: "manage", label: "Full property management" },
  { id: "tenants", label: "Find tenants only" },
  { id: "rent", label: "Rent collection" },
  { id: "sell", label: "Sell my property" },
  { id: "valuation", label: "Property valuation" },
  { id: "diaspora", label: "Diaspora owner support" },
] as const;

export const pmPropertyTypes = [
  { value: "house", label: "House" },
  { value: "flat", label: "Flat / Apartment" },
  { value: "cottage", label: "Cottage" },
  { value: "commercial", label: "Commercial" },
  { value: "land", label: "Land" },
] as const;

export const pmFormTrust = [
  { icon: ShieldCheck, label: "No obligation" },
  { icon: BadgeCheck, label: "100% confidential" },
  { icon: Headphones, label: "Expert team" },
] as const;
