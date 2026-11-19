import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { profileQuery } from "@/lib/queries";
import { AppShell } from "@/components/rulis/AppShell";
import { OriginProvider } from "@/hooks/use-origin";

export const Route = createFileRoute("/_authenticated/_app")({
  beforeLoad: async ({ context }) => {
    const profile = await context.queryClient.ensureQueryData(profileQuery);
    if (!profile?.onboarding_completed) throw redirect({ to: "/onboarding" });
    return { profile };
  },
  component: AppLayout,
});

function AppLayout() {
  const { profile } = Route.useRouteContext();
  if (profile && !profile.is_active) {
    return (
      <div className="grid min-h-dvh place-items-center px-6 text-center">
        <div>
          <h1 className="text-2xl font-extrabold">Sua conta está desativada</h1>
          <p className="mt-2 text-muted-foreground">Fale com a equipe RULIS para reativá-la.</p>
        </div>
      </div>
    );
  }
  return (
    <OriginProvider>
      <AppShell>
        <Outlet />
      </AppShell>
    </OriginProvider>
  );
}
