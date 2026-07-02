type InvoicePdfUrlParams =
  | {
      invoiceId: string;
      fromPartnerId?: never;
      toOrganisationId?: never;
      toPartnerId?: never;
    }
  | {
      invoiceId?: never;
      fromPartnerId: string;
      toOrganisationId: string;
      toPartnerId?: never;
    }
  | {
      invoiceId?: never;
      fromPartnerId: string;
      toOrganisationId?: never;
      toPartnerId: string;
    };

const coreBaseUrl =
  process.env.NODE_ENV === "development"
    ? "http://localhost:3000"
    : process.env.NEXT_PUBLIC_CORE_BASE_URL || "https://core.voxd.ai";

const getInvoicePdfUrl = (params: InvoicePdfUrlParams) => {
  const searchParams = new URLSearchParams();

  if (typeof params.invoiceId === "string") {
    searchParams.set("invoiceId", params.invoiceId);
    return `${coreBaseUrl}/api/invoice/pdf?${searchParams.toString()}`;
  }

  searchParams.set("fromPartnerId", params.fromPartnerId);

  if (typeof params.toOrganisationId === "string") {
    searchParams.set("toOrganisationId", params.toOrganisationId);
  }

  if (typeof params.toPartnerId === "string") {
    searchParams.set("toPartnerId", params.toPartnerId);
  }

  return `${coreBaseUrl}/api/invoice/pdf?${searchParams.toString()}`;
};

export default getInvoicePdfUrl;
