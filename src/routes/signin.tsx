import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { SignInForm } from "@/components/SignInForm";
import { PasswordRecoveryForm } from "@/components/PasswordRecoveryForm";
import { signIn } from "@/lib/auth";

export const Route = createFileRoute("/signin")({
  validateSearch: (search: Record<string, unknown>): { next?: "hub"; recovery?: true } => ({
    ...(search["next"] === "hub" ? { next: "hub" } : {}),
    ...(search["recovery"] === true ? { recovery: true } : {}),
  }),
  component: SignInPage,
});

function SignInPage() {
  const navigate = useNavigate();
  const { next, recovery } = Route.useSearch();

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
        <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
          {recovery ? "Forgot password" : "Sign in"}
        </h1>
      </div>
      <p className="mx-auto mb-4 max-w-md text-sm leading-relaxed text-muted-foreground">
        {recovery
          ? "Enter the email you use for Student Steals."
          : "Sign in to find your saved discounts and events in My Hub on your devices."}
      </p>
      {recovery ? (
        <PasswordRecoveryForm />
      ) : (
        <>
          <SignInForm onSubmit={handleSignIn} />
          <div className="flex justify-center">
            <Link
              to="/signin"
              search={{ recovery: true }}
              className="inline-flex min-h-11 items-center text-sm font-medium text-primary underline"
            >
              Forgot your password?
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
