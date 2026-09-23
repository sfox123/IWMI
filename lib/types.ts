import { z } from "zod";

export const FileRefSchema = z.object({
  key: z.string(), // storage key (S3 key or local relative path)
  name: z.string(),
  size: z.number(),
  type: z.string().optional(),
  uploadedAt: z.string(),
});
export type FileRef = z.infer<typeof FileRefSchema>;

export const ItemResponseSchema = z.object({
  itemId: z.string(),
  sectorId: z.string(),
  levels: z.array(z.string()).default([]),
  frequency: z.string().optional().default(""),
  yearFrom: z.string().optional().default(""),
  yearTo: z.string().optional().default(""),
  formats: z.array(z.string()).default([]),
  globalCoverage: z.boolean().default(false),
  countries: z.array(z.string()).default([]), // ISO alpha-2
  area: z.string().optional().default(""), // free text: basin, region, province…
  resolution: z.string().optional().default(""),
  link: z.string().optional().default(""),
  notes: z.string().optional().default(""),
  files: z.array(FileRefSchema).default([]),
});
export type ItemResponse = z.infer<typeof ItemResponseSchema>;

export const OtherDatasetSchema = z.object({
  name: z.string(),
  description: z.string().optional().default(""),
  sectorId: z.string().optional().default(""),
  coverage: z.string().optional().default(""),
  years: z.string().optional().default(""),
  format: z.string().optional().default(""),
  files: z.array(FileRefSchema).default([]),
});
export type OtherDataset = z.infer<typeof OtherDatasetSchema>;

export const SubmissionSchema = z.object({
  id: z.string().uuid(),
  contact: z.object({
    name: z.string().min(1, "Name is required"),
    designation: z.string().optional().default(""),
    affiliation: z.string().min(1, "Affiliation is required"),
    country: z.string().optional().default(""),
    email: z.string().email("Enter a valid email"),
    phone: z.string().optional().default(""),
  }),
  sectors: z.array(z.string()).min(1, "Select at least one sector"),
  subsectors: z.record(z.string(), z.array(z.string())).default({}),
  items: z.array(ItemResponseSchema).default([]),
  others: z.array(OtherDatasetSchema).default([]),
  sharing: z.object({
    access: z.string().optional().default(""),
    approver: z.string().optional().default(""),
    portal: z.string().optional().default(""),
  }),
  progress: z.object({
    done: z.string().optional().default(""),
    next3Months: z.string().optional().default(""),
    support: z.string().optional().default(""),
  }),
});
export type SubmissionInput = z.infer<typeof SubmissionSchema>;

export type SubmissionStatus = "new" | "reviewed" | "follow-up" | "complete";
export type Submission = SubmissionInput & {
  submittedAt: string;
  status: SubmissionStatus;
  adminNotes?: string;
};
