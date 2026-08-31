import getFaqById from "@/lib/getFaqById";
import H1 from "@/components/adminui/H1";
import Container from "@/components/adminui/Container";
import { notFound } from "next/navigation";
import { verifyAccessToken } from "@/lib/auth/verifyToken";
import DataCard from "@/components/adminui/DataCard";
import { Calendar, Lock, Unlock, FolderOpen, HelpCircle } from "lucide-react";
import { format } from "date-fns";
import EditFaqForm from "./editFaqForm";
import FaqActions from "./faqActions";
import BreadcrumbSetter from "@/components/admin/BreadcrumbSetter";
import saGetFaqCategories from "@/actions/saGetFaqCategories";
import { MarkdownContent } from "@/components/MarkdownContent";

export default async function Page({ params }: { params: { faqId: string } }) {
  const { faqId } = await params;

  const accessToken = await verifyAccessToken();
  if (!accessToken.superAdmin) {
    return notFound();
  }

  const faq = await getFaqById(faqId);

  if (!faq) return notFound();

  const isSuperAdmin = true;

  const categories = await saGetFaqCategories();
  const categoryName =
    categories.find((c) => c.id === faq.categoryId)?.name || "Uncategorized";

  const dataItems = [
    {
      icon: <FolderOpen className="h-4 w-4" />,
      label: "Category",
      value: categoryName,
    },
    {
      icon: faq.partnersOnly ? (
        <Lock className="h-4 w-4" />
      ) : (
        <Unlock className="h-4 w-4" />
      ),
      label: "Visibility",
      value: faq.partnersOnly ? "Partners Only" : "Public",
    },
    {
      icon: <Calendar className="h-4 w-4" />,
      label: "Created",
      value: format(new Date(faq.createdAt), "PPpp"),
    },
    {
      icon: <Calendar className="h-4 w-4" />,
      label: "Updated",
      value: format(new Date(faq.updatedAt), "PPpp"),
    },
  ];

  return (
    <Container>
      <BreadcrumbSetter
        breadcrumbs={[
          { label: "Admin", href: "/" },
          { label: "FAQ", href: "/faq" },
          {
            label:
              faq.question.substring(0, 50) +
              (faq.question.length > 50 ? "..." : ""),
          },
        ]}
      />
      <div className="flex justify-between items-start mb-6">
        <H1>FAQ Details</H1>
        {isSuperAdmin && <FaqActions faqId={faqId} />}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Info Card */}
        <DataCard items={dataItems} />

        {/* Edit Form - Only for super admins */}
        {isSuperAdmin && (
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-lg font-semibold mb-4">Edit FAQ</h2>
            <EditFaqForm
              faqId={faqId}
              question={faq.question}
              answer={faq.answer}
              partnersOnly={faq.partnersOnly}
              categoryId={faq.categoryId}
              categories={categories}
            />
          </div>
        )}
      </div>

      {/* Question and Answer Display - For non-super-admins */}
      {!isSuperAdmin && (
        <div className="mt-6 space-y-6">
          {/* Question */}
          <div className="bg-white rounded-lg border p-6">
            <div className="flex items-center gap-2 mb-4">
              <HelpCircle className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Question</h2>
            </div>
            <p className="text-lg text-gray-900">{faq.question}</p>
          </div>

          {/* Answer */}
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-lg font-semibold mb-4">Answer</h2>
            <MarkdownContent content={faq.answer} />
          </div>
        </div>
      )}
    </Container>
  );
}
