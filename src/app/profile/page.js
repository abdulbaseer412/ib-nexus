import { requireCompleteProfile } from "@/lib/auth";
import { getDisplayName, getProgramLabel, getAvatarUrl } from "@/lib/profile";
import { updateProfile } from "./actions";
import ProfileForm from "./ProfileForm";

export const metadata = {
  title: "Profile — IB Nexus",
};

export default async function ProfilePage() {
  const { user, profile } = await requireCompleteProfile();
  const displayName = getDisplayName(user, profile);
  const programLabel = getProgramLabel(profile.ib_program);
  const avatarUrl = getAvatarUrl(user, profile);

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background px-4 py-10 sm:py-14">
      <div className="max-w-lg mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-primary mb-1">
            Profile
          </h1>
          <p className="text-secondary text-sm">
            Manage your account information. Changes appear everywhere instantly.
          </p>
        </div>

        <div className="p-6 rounded-2xl border border-subtle bg-card space-y-6">
          <div className="pb-6 border-b border-divider">
            <div className="min-w-0">
              <p className="font-semibold text-primary truncate">
                {displayName}
              </p>
              <p className="text-sm text-secondary truncate">
                {user.email}
              </p>
              {programLabel && (
                <span className="inline-flex mt-1 items-center px-2 py-0.5 rounded-full text-xs font-medium bg-surface-alt text-secondary">
                  {programLabel}
                </span>
              )}
            </div>
          </div>

          <ProfileForm
            defaultDisplayName={profile.display_name || displayName}
            defaultIbProgram={profile.ib_program || ""}
            currentAvatarUrl={profile.avatar_url}
            googleAvatarUrl={user.user_metadata?.avatar_url || user.user_metadata?.picture || null}
            displayName={displayName}
            updateProfile={updateProfile}
          />
        </div>
      </div>
    </main>
  );
}
