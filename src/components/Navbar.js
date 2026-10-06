import { getAuthSession } from "@/lib/auth";
import { getDisplayName, getAvatarUrl } from "@/lib/profile";
import { fetchDirectLockStatus } from "@/lib/website-lock";
import { isUserApprovedForLockedSite } from "@/lib/website-access-allowlist";
import NavbarClient from "./NavbarClient";

export default async function Navbar() {
  const lockStatus = await fetchDirectLockStatus();
  const { user, profile } = await getAuthSession();

  if (lockStatus?.is_locked) {
    const isApproved = await isUserApprovedForLockedSite(user, profile);
    if (!isApproved) {
      return null;
    }
  }

  const displayName = getDisplayName(user, profile);
  const avatarUrl = getAvatarUrl(user, profile);

  return <NavbarClient email={user?.email} displayName={displayName} avatarUrl={avatarUrl} />;
}
