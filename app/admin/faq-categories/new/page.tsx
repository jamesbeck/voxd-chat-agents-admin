import H1 from "@/components/adminui/H1";
import Container from "@/components/adminui/Container";
import { verifyAccessToken } from "@/lib/auth/verifyToken";
import BreadcrumbSetter from "@/components/admin/BreadcrumbSetter";
import NewFaqCategoryForm from "./newFaqCategoryForm";
import { notFound } from "next/navigation";

export default async function Page() {
  const accessToken = await verifyAccessToken();

  // Only super admins can create FAQ categories
  if (!accessToken.superAdmin) {
    return notFound();
  }

  return (
    <Container>
      <BreadcrumbSetter
        breadcrumbs={[
          { label: "Admin", href: "/" },
          { label: "FAQ Categories", href: "/faq-categories" },
          { label: "New Category" },
        ]}
      />
      <H1>Create New FAQ Category</H1>

      <NewFaqCategoryForm />
    </Container>
  );
}
