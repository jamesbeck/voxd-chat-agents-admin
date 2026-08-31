import H1 from "@/components/adminui/H1";
import FaqTable from "./faqTable";
import Container from "@/components/adminui/Container";
import { verifyAccessToken } from "@/lib/auth/verifyToken";
import BreadcrumbSetter from "@/components/admin/BreadcrumbSetter";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";
import { notFound } from "next/navigation";

export default async function Page() {
  const accessToken = await verifyAccessToken();

  if (!accessToken.superAdmin) {
    return notFound();
  }

  const isSuperAdmin = accessToken.superAdmin;

  return (
    <Container>
      <BreadcrumbSetter
        breadcrumbs={[{ label: "Admin", href: "/" }, { label: "FAQ" }]}
      />
      <H1>FAQ</H1>

      {isSuperAdmin && (
        <div className="flex justify-end">
          <Button asChild>
            <Link href="/faq/new">
              <Plus className="h-4 w-4 mr-2" />
              New FAQ
            </Link>
          </Button>
        </div>
      )}

      <FaqTable isSuperAdmin={isSuperAdmin} />
    </Container>
  );
}
