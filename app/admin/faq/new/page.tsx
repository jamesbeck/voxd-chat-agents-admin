import H1 from "@/components/adminui/H1";
import Container from "@/components/adminui/Container";
import { verifyAccessToken } from "@/lib/auth/verifyToken";
import BreadcrumbSetter from "@/components/admin/BreadcrumbSetter";
import NewFaqForm from "./newFaqForm";
import { notFound } from "next/navigation";
import saGetFaqCategories from "@/actions/saGetFaqCategories";

export default async function Page() {
  const accessToken = await verifyAccessToken();

  // Only super admins can create FAQs
  if (!accessToken.superAdmin) {
    return notFound();
  }

  const categories = await saGetFaqCategories();

  return (
    <Container>
      <BreadcrumbSetter
        breadcrumbs={[
          { label: "Admin", href: "/" },
          { label: "FAQ", href: "/faq" },
          { label: "New FAQ" },
        ]}
      />
      <H1>Create New FAQ</H1>

      <NewFaqForm categories={categories} />
    </Container>
  );
}
