import getFaqCategoryById from "@/lib/getFaqCategoryById";
import H1 from "@/components/adminui/H1";
import Container from "@/components/adminui/Container";
import { notFound } from "next/navigation";
import { verifyAccessToken } from "@/lib/auth/verifyToken";
import DataCard from "@/components/adminui/DataCard";
import { FolderOpen, Calendar } from "lucide-react";
import { format } from "date-fns";
import EditFaqCategoryForm from "./editFaqCategoryForm";
import FaqCategoryActions from "./faqCategoryActions";
import BreadcrumbSetter from "@/components/admin/BreadcrumbSetter";

export default async function Page({
  params,
}: {
  params: Promise<{ categoryId: string }>;
}) {
  const { categoryId } = await params;

  const accessToken = await verifyAccessToken();

  // Only super admins can access FAQ categories
  if (!accessToken.superAdmin) {
    return notFound();
  }

  const category = await getFaqCategoryById(categoryId);

  if (!category) return notFound();

  const dataItems = [
    {
      icon: <FolderOpen className="h-4 w-4" />,
      label: "Name",
      value: category.name,
    },
    {
      icon: <Calendar className="h-4 w-4" />,
      label: "Created",
      value: format(new Date(category.createdAt), "PPpp"),
    },
    {
      icon: <Calendar className="h-4 w-4" />,
      label: "Updated",
      value: format(new Date(category.updatedAt), "PPpp"),
    },
  ];

  return (
    <Container>
      <BreadcrumbSetter
        breadcrumbs={[
          { label: "Admin", href: "/" },
          { label: "FAQ Categories", href: "/faq-categories" },
          { label: category.name },
        ]}
      />
      <div className="flex justify-between items-start mb-6">
        <H1>FAQ Category Details</H1>
        <FaqCategoryActions
          categoryId={categoryId}
          categoryName={category.name}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Info Card */}
        <DataCard items={dataItems} />

        {/* Edit Form */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">Edit Category</h2>
          <EditFaqCategoryForm categoryId={categoryId} name={category.name} />
        </div>
      </div>
    </Container>
  );
}
