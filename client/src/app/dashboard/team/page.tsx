"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/dashboard/ui";
import { InlineListSkeleton, TeamSkeleton } from "@/components/dashboard/Skeletons";
import { authClient } from "@/lib/api/auth-client";
import { useAuth } from "@/providers/AuthProvider";

interface OrgMember {
  id: string;
  role: string;
  userId: string;
  user: { id: string; name: string; email: string };
}

interface OrgInvitation {
  id: string;
  email: string;
  role: string | null;
  status: string;
}

interface FullOrg {
  id: string;
  name: string;
  slug: string;
  members: OrgMember[];
  invitations: OrgInvitation[];
}

function slugify(name: string): string {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 28) || "workspace";
  return `${base}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function TeamPage() {
  const { session } = useAuth();
  const {
    data: orgs,
    isPending: orgsLoading,
    refetch: refetchOrgs,
  } = authClient.useListOrganizations();
  const { data: activeOrg, refetch: refetchActive } =
    authClient.useActiveOrganization();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [full, setFull] = useState<FullOrg | null>(null);
  const [fullLoading, setFullLoading] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [creating, setCreating] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"member" | "admin">("member");
  const [inviting, setInviting] = useState(false);

  const effectiveId = selectedId ?? activeOrg?.id ?? orgs?.[0]?.id ?? null;

  const loadFull = useCallback(async (organizationId: string) => {
    setFullLoading(true);
    try {
      const { data, error } = await authClient.organization.getFullOrganization(
        {
          query: { organizationId, membersLimit: 100 },
        },
      );
      if (error || !data) {
        setFull(null);
        return;
      }
      setFull(data as unknown as FullOrg);
    } finally {
      setFullLoading(false);
    }
  }, []);

  useEffect(() => {
    if (effectiveId) void loadFull(effectiveId);
    else setFull(null);
  }, [effectiveId, loadFull]);

  async function refreshAll(id: string | null) {
    await Promise.all([refetchOrgs(), refetchActive()]);
    if (id) await loadFull(id);
  }

  async function handleCreateOrg(event: FormEvent) {
    event.preventDefault();
    const name = newOrgName.trim();
    if (!name) {
      toast.error("Give the workspace a name.");
      return;
    }
    setCreating(true);
    try {
      const { data, error } = await authClient.organization.create({
        name,
        slug: slugify(name),
      });
      if (error || !data) {
        toast.error("Could not create the workspace.");
        return;
      }
      setNewOrgName("");
      setSelectedId((data as unknown as { id: string }).id);
      toast.success(`"${name}" created`);
      await refreshAll((data as unknown as { id: string }).id);
    } finally {
      setCreating(false);
    }
  }

  async function handleSetActive(organizationId: string) {
    const { error } = await authClient.organization.setActive({
      organizationId,
    });
    if (error) {
      toast.error("Could not switch workspace.");
      return;
    }
    setSelectedId(organizationId);
    toast.success("Workspace switched");
    await refreshAll(organizationId);
  }

  async function handleInvite(event: FormEvent) {
    event.preventDefault();
    if (!effectiveId) return;
    const email = inviteEmail.trim();
    if (!email) {
      toast.error("Enter an email to invite.");
      return;
    }
    setInviting(true);
    try {
      const { error } = await authClient.organization.inviteMember({
        email,
        role: inviteRole,
        organizationId: effectiveId,
      });
      if (error) {
        toast.error(
          error.message || "Could not send the invitation.",
        );
        return;
      }
      setInviteEmail("");
      toast.success(`Invitation sent to ${email}`);
      await loadFull(effectiveId);
    } finally {
      setInviting(false);
    }
  }

  async function handleRemoveMember(member: OrgMember) {
    if (!effectiveId) return;
    if (member.userId === session?.id) {
      toast.error("You can't remove yourself here.");
      return;
    }
    const { error } = await authClient.organization.removeMember({
      memberIdOrEmail: member.id,
      organizationId: effectiveId,
    });
    if (error) {
      toast.error("Could not remove this member.");
      return;
    }
    toast.success(`${member.user.email} removed`);
    await loadFull(effectiveId);
  }

  async function handleCancelInvite(invitationId: string) {
    const { error } = await authClient.organization.cancelInvitation({
      invitationId,
    });
    if (error) {
      toast.error("Could not cancel the invitation.");
      return;
    }
    toast.success("Invitation cancelled");
    if (effectiveId) await loadFull(effectiveId);
  }

  const inputCls =
    "mt-2 w-full border border-ink/15 bg-paper px-3 py-3 text-sm outline-none focus:border-lime";
  const btnCls =
    "bg-lime px-5 py-3 text-xs font-bold uppercase tracking-[0.06em] text-ink hover:bg-lime/80 disabled:opacity-50";

  return (
    <div>
      <PageHeader
        kicker="Workspace"
        title="Team"
        description="Workspaces, members, and email invitations."
      />

      {orgsLoading ? (
        <TeamSkeleton />
      ) : (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,22rem)_1fr]">
          <div className="space-y-6">
            <section className="border border-ink/12 bg-paper p-5">
              <h2 className="font-[family-name:var(--font-display)] text-lg font-bold">
                Workspaces
              </h2>
              <ul className="mt-4 space-y-2">
                {(orgs ?? []).map((org) => (
                  <li key={org.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(org.id)}
                      className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${
                        effectiveId === org.id
                          ? "border-ink bg-ink text-bone"
                          : "border-ink/15 bg-paper hover:border-ink/40"
                      }`}
                    >
                      <span className="font-semibold">{org.name}</span>
                      {activeOrg?.id === org.id ? (
                        <span className="text-[0.65rem] uppercase tracking-[0.12em] opacity-70">
                          Active
                        </span>
                      ) : null}
                    </button>
                  </li>
                ))}
                {(orgs ?? []).length === 0 ? (
                  <li className="text-sm text-mute">
                    No workspaces yet — create one below.
                  </li>
                ) : null}
              </ul>
              {effectiveId && activeOrg?.id !== effectiveId ? (
                <button
                  type="button"
                  onClick={() => void handleSetActive(effectiveId)}
                  className="mt-4 w-full border border-ink/15 px-3 py-2.5 text-xs font-bold uppercase tracking-[0.06em] hover:border-ink/40"
                >
                  Switch to this workspace
                </button>
              ) : null}
            </section>

            <section className="border border-ink/12 bg-paper p-5">
              <h2 className="font-[family-name:var(--font-display)] text-lg font-bold">
                New workspace
              </h2>
              <form onSubmit={handleCreateOrg} className="mt-4 space-y-3">
                <input
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  placeholder="e.g. Lagos crew"
                  className={inputCls}
                />
                <button type="submit" disabled={creating} className={btnCls}>
                  {creating ? "Creating…" : "Create workspace"}
                </button>
              </form>
            </section>
          </div>

          <div className="space-y-6">
            <section className="border border-ink/12 bg-paper p-5">
              <h2 className="font-[family-name:var(--font-display)] text-lg font-bold">
                Members
                {full ? (
                  <span className="text-mute"> · {full.name}</span>
                ) : null}
              </h2>
              {fullLoading ? (
                <InlineListSkeleton />
              ) : full ? (
                <ul className="mt-4 divide-y divide-ink/10">
                  {full.members.map((member) => (
                    <li
                      key={member.id}
                      className="flex items-center justify-between gap-3 py-2.5 text-sm"
                    >
                      <div>
                        <p className="font-semibold text-ink">
                          {member.user.name}
                          {member.userId === session?.id ? " (you)" : ""}
                        </p>
                        <p className="text-mute">
                          {member.user.email} · {member.role}
                        </p>
                      </div>
                      {member.userId !== session?.id ? (
                        <button
                          type="button"
                          onClick={() => void handleRemoveMember(member)}
                          className="text-xs font-bold uppercase tracking-[0.06em] text-red-700 hover:underline"
                        >
                          Remove
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-sm text-mute">
                  Select a workspace to see members.
                </p>
              )}
            </section>

            <section className="border border-ink/12 bg-paper p-5">
              <h2 className="font-[family-name:var(--font-display)] text-lg font-bold">
                Invite by email
              </h2>
              <form
                onSubmit={handleInvite}
                className="mt-4 grid gap-3 sm:grid-cols-[1fr_8rem_auto]"
              >
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="teammate@email.com"
                  className={inputCls.replace("mt-2 ", "")}
                />
                <select
                  value={inviteRole}
                  onChange={(e) =>
                    setInviteRole(
                      e.target.value === "admin" ? "admin" : "member",
                    )
                  }
                  className={inputCls.replace("mt-2 ", "")}
                  aria-label="Role"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
                <button
                  type="submit"
                  disabled={inviting || !effectiveId}
                  className={btnCls}
                >
                  {inviting ? "Sending…" : "Invite"}
                </button>
              </form>
              <p className="mt-3 text-xs text-mute">
                They get an email with an accept link. New people sign up
                first, then open the link.
              </p>

              {full && full.invitations.filter((i) => i.status === "pending").length > 0 ? (
                <ul className="mt-4 divide-y divide-ink/10">
                  {full.invitations
                    .filter((i) => i.status === "pending")
                    .map((inv) => (
                      <li
                        key={inv.id}
                        className="flex items-center justify-between gap-3 py-2.5 text-sm"
                      >
                        <p className="text-ink">
                          {inv.email}{" "}
                          <span className="text-mute">
                            · {inv.role ?? "member"} · pending
                          </span>
                        </p>
                        <button
                          type="button"
                          onClick={() => void handleCancelInvite(inv.id)}
                          className="text-xs font-bold uppercase tracking-[0.06em] text-red-700 hover:underline"
                        >
                          Cancel
                        </button>
                      </li>
                    ))}
                </ul>
              ) : null}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
