// Stable identifiers for national assessment / admissions exam groups.
// The labels come from Educhi's requested catalogue. Do not infer track
// membership from an exam title: an Admin must explicitly classify each exam.
export const specialExamTracks = [
  { id: "HSA", slug: "hsa", label: "HSA" },
  { id: "TSA", slug: "tsa", label: "TSA" },
  { id: "V_ACT", slug: "v-act", label: "V-ACT" },
  { id: "QDA", slug: "qda", label: "QDA" },
  { id: "BQA", slug: "bqa", label: "BQA" },
  { id: "DGNL_BCA", slug: "dgnl-bca", label: "ĐGNL BCA" },
] as const;

export type SpecialExamTrack = (typeof specialExamTracks)[number]["id"];

export function getSpecialExamTrack(value: string) {
  return specialExamTracks.find((track) => track.id === value || track.slug === value);
}
