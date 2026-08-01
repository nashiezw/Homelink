export type LegalPageId = "terms" | "privacy" | "returns";

export type LegalPage = {
  id: LegalPageId;
  title: string;
  summary: string;
  body: string;
  effectiveDate: string;
  status: "draft" | "published";
  updatedAt: string;
};
