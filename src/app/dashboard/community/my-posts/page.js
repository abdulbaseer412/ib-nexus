import { redirect } from "next/navigation";

export default function MyPostsPage() {
  redirect("/dashboard/community/my-discussions");
}
