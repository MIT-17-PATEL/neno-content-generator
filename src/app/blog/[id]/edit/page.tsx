"use client";

import { useParams } from "next/navigation";
import { BlogEditor } from "@/components/blog/blog-editor";

export default function EditBlogPage() {
  const params = useParams();
  const id = params.id as string;

  return <BlogEditor initialId={id} />;
}
