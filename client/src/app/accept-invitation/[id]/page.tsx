"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { authClient } from "@/lib/api/auth-client";
import { useAuth } from "@/providers/AuthProvider";

interface InvitationDetails {
  id: string;
  email: string;
  role: string | null;
  status: string;
  organizationName: string;
}

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={null}>
      <AcceptInvitationInner />
    </Suspense>
  );
}

function AcceptInvitationInner() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { session, isLoading: authLoading } = useAuth();
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  const invitationId = params.id;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data, error } = await authClient.organization.getInvitation({
        query: { id: invitationId },
      });
      if (cancelled) return;
      if (error || !data) {
        setLoadError(
          "This invitation link is invalid or expired. Ask for a fresh invite.",
        );
        return;
      }
      const inv = data as unknown as {
        id: string;
        email: string;
        role: string | null;
        status: string;
        organizationName?: string;
        organization?: { name?: string };
      };
      setInvitation({
        id: inv.id,
        email: inv.email,
        role: inv.role,
        status: inv.status,
        organizationName:
          inv.organizationName ?? inv.organization?.name ?? "a workspace",
      });
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [invitationId]);

  async function handleAccept() {
    setWorking(true);
    try {
      const { error } = await authClient.organization.acceptInvitation({
        invitationId,
      });
      if (error) {
        toast.error(error.message || "Could not accept this invitation.");
        setWorking(false);
        return;
      }
      toast.success("Welcome to the workspace");
      router.push("/dashboard/team");
    } catch {
      toast.error("Something went wrong. Try again in a moment.");
      setWorking(false);
    }
  }

  async function handleReject() {
    setWorking(true);
    try {
      await authClient.organization.rejectInvitation({ invitationId });
      toast.message("Invitation declined");
      router.push("/dashboard");
    } catch {
      toast.error("Something went wrong. Try again in a moment.");
      setWorking(false);
    }
  }

  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-clip bg-[#f3f0e8] text-[#0b1f1c]">
      <header className="relative z-20 flex items-center justify-between px-[clamp(1.1rem,3vw,2.4rem)] py-5">
        <BrandLogo href="/" size="sm" />
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-[clamp(1.1rem,3vw,2.4rem)] py-8">
        <section
          aria-label="Accept invitation"
          className="relative w-full max-w-[26rem] rounded-2xl border border-[#0b1f1c]/10 bg-white p-6 shadow-[0_24px_80px_rgba(11,31,28,0.12)] sm:p-8"
        >
          <p className="m-0 text-[0.68rem] tracking-[0.16em] text-[#5a6b14] uppercase">
            Workspace invite
          </p>
          <h1 className="mt-2 mb-7 font-heading text-[1.65rem] font-extrabold tracking-[-0.04em]">
            Join the team
          </h1>

          {loadError ? (
            <div className="grid gap-5">
              <p className="text-[0.95rem] text-[#52706a]">{loadError}</p>
              <Link
                href="/dashboard/team"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#d6ff3c] px-5 py-3.5 text-[0.82rem] font-bold tracking-[0.04em] text-[#070807] uppercase hover:bg-[#e2ff6a]"
              >
                Go to team
              </Link>
            </div>
          ) : !invitation ? (
            <p className="text-[0.95rem] text-[#52706a]">
              Loading invitation…
            </p>
          ) : invitation.status !== "pending" ? (
            <div className="grid gap-5">
              <p className="text-[0.95rem] text-[#52706a]">
                This invitation was already {invitation.status}.
              </p>
              <Link
                href="/dashboard/team"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#d6ff3c] px-5 py-3.5 text-[0.82rem] font-bold tracking-[0.04em] text-[#070807] uppercase hover:bg-[#e2ff6a]"
              >
                Go to team
              </Link>
            </div>
          ) : authLoading ? (
            <p className="text-[0.95rem] text-[#52706a]">Checking session…</p>
          ) : !session ? (
            <div className="grid gap-5">
              <p className="text-[0.95rem] text-[#52706a]">
                You&apos;ve been invited to join{" "}
                <span className="font-semibold text-[#0b1f1c]">
                  {invitation.organizationName}
                </span>{" "}
                as {invitation.role ?? "member"}. Log in (or sign up) first,
                then reopen this link to accept.
              </p>
              <Link
                href="/login"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#d6ff3c] px-5 py-3.5 text-[0.82rem] font-bold tracking-[0.04em] text-[#070807] uppercase hover:bg-[#e2ff6a]"
              >
                Log in to accept
              </Link>
            </div>
          ) : (
            <div className="grid gap-5">
              <p className="text-[0.95rem] text-[#52706a]">
                <span className="font-semibold text-[#0b1f1c]">
                  {invitation.organizationName}
                </span>{" "}
                invited {invitation.email} as {invitation.role ?? "member"}.
              </p>
              <div className="grid gap-3">
                <button
                  type="button"
                  disabled={working}
                  onClick={() => void handleAccept()}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#d6ff3c] px-5 py-3.5 text-[0.82rem] font-bold tracking-[0.04em] text-[#070807] uppercase transition hover:bg-[#e2ff6a] disabled:opacity-55"
                >
                  {working ? "Working…" : "Accept invitation"}
                </button>
                <button
                  type="button"
                  disabled={working}
                  onClick={() => void handleReject()}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#0b1f1c]/15 px-5 py-3.5 text-[0.82rem] font-bold tracking-[0.04em] uppercase transition hover:border-[#0b1f1c]/40 disabled:opacity-55"
                >
                  Decline
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
