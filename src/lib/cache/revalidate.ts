import { revalidatePath, revalidateTag } from "next/cache";

export async function revalidateBlogCache(slug?: string) {
  try {
    revalidatePath("/blog-with-sidebar");
    revalidatePath("/blog-with-sidebar", "page");
    revalidatePath("/");
    revalidatePath("/(public)/blog-with-sidebar", "page");
    revalidateTag("published-blogs");
    revalidateTag("blogs");
    if (slug) {
      revalidatePath(`/blog/${slug}`);
      revalidatePath(`/blog/${slug}`, "page");
    }
  } catch (err) {
    // Graceful ignore during static build or serverless non-request contexts
    console.warn("Blog cache revalidation notice:", err);
  }
}
