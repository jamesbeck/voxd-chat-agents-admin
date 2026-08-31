import Link from "next/link";
import H1 from "@/components/adminui/H1";
import BreadcrumbSetter from "@/components/admin/BreadcrumbSetter";
import Container from "@/components/adminui/Container";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

function getErrorMessage(error: string | undefined): {
  title: string;
  description: string;
} {
  if (!error) {
    return {
      title: "Connection Failed",
      description: "An unknown error occurred while connecting your account.",
    };
  }

  // Handle common OAuth errors
  if (error.includes("access_denied") || error.includes("denied")) {
    return {
      title: "Access Denied",
      description:
        "You declined to grant access to your account. To use integrations, you need to allow access when prompted.",
    };
  }

  if (error.includes("expired") || error.includes("state")) {
    return {
      title: "Session Expired",
      description:
        "Your authorization session has expired. This can happen if you took too long to complete the sign-in process. Please try again.",
    };
  }

  if (error.includes("token") || error.includes("exchange")) {
    return {
      title: "Token Exchange Failed",
      description:
        "We were unable to complete the authorization with the provider. This may be a temporary issue. Please try again.",
    };
  }

  return {
    title: "Connection Failed",
    description: error,
  };
}

export default async function OAuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const { title, description } = getErrorMessage(error);

  return (
    <Container>
      <BreadcrumbSetter
        breadcrumbs={[
          { label: "Admin", href: "/" },
          { label: "Connected Accounts", href: "/oauth-accounts" },
          { label: "Error" },
        ]}
      />
      <H1>Connection Error</H1>

      <div className="max-w-2xl">
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{title}</AlertTitle>
          <AlertDescription>{description}</AlertDescription>
        </Alert>

        <div className="flex gap-4">
          <Button asChild>
            <Link href="/oauth-accounts">Back to Connected Accounts</Link>
          </Button>
        </div>

        {error && (
          <div className="mt-8 p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground font-mono break-all">
              Error details: {error}
            </p>
          </div>
        )}
      </div>
    </Container>
  );
}
