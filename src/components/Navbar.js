import { getAuthSession } from "@/lib/auth";
import { getDisplayName, getAvatarUrl } from "@/lib/profile";
import NavbarClient from "./NavbarClient";

export default async function Navbar() {
  const { user, profile } = await getAuthSession();
  const displayName = getDisplayName(user, profile);
  const avatarUrl = getAvatarUrl(user, profile);

  return <NavbarClient email={user?.email} displayName={displayName} avatarUrl={avatarUrl} />;
}
