export type LegalPageId = "terms" | "privacy";

export type LegalPage = {
  id: LegalPageId;
  title: string;
  summary: string;
  body: string;
  effectiveDate: string;
  status: "draft" | "published";
  updatedAt: string;
};
