"use client";

import { useParams } from "next/navigation";
import { CaseStudyEditor } from "@/components/case-studies/case-study-editor";

export default function EditCaseStudyPage() {
  const params = useParams();
  const id = params.id as string;

  return <CaseStudyEditor initialId={id} />;
}
