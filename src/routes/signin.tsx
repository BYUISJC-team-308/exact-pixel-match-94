import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { SignInForm } from "@/components/SignInForm";
import { signIn } from "@/lib/auth";

export const Route = createFileRoute("/signin")({
  validateSearch: (search: Record<string, unknown>): { next?: "hub" } =>
    search["next"] === "hub" ? { next: "hub" } : {},
  component: SignInPage,
});

function SignInPage() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();

  const handleSignIn = async (email: string, password: string): Promise<string | null> => {
    const err = await signIn(email, password);
    if (err) return err;
    if (next === "hub") await navigate({ to: "/", hash: "my-hub" });
    else await navigate({ to: "/profile" });
    return null;
  };

  return (
    <div className="mx-auto max-w-7xl pb-10 sm:pb-16">
      <div className="rise py-10 text-center">
        <span className="inline-flex rounded-full bg-secondary px-3 py-1 text-xs font-medium text-primary ring-1 ring-border">
          Welcome back
        </span>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">Sign in</h1>
      </div>
      <SignInForm onSubmit={handleSignIn} />
    </div>
  );
}
