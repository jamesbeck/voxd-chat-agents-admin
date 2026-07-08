export type PendingInvoiceGrouping = {
  toOrganisationId?: string | null;
  toPartnerId?: string | null;
};

export const isPartnerToPartnerPendingInvoice = ({
  toPartnerId,
}: Pick<PendingInvoiceGrouping, "toPartnerId">) => Boolean(toPartnerId);

export const getPendingInvoiceId = ({
  toOrganisationId,
  toPartnerId,
}: PendingInvoiceGrouping) => {
  if (toPartnerId) {
    return `pending:partner:${toPartnerId}`;
  }

  if (!toOrganisationId) {
    throw new Error(
      "Pending invoices require a destination organisation when no partner target is set",
    );
  }

  return `pending:organisation:${toOrganisationId}`;
};

export const getPendingInvoiceSearchParams = ({
  toOrganisationId,
  toPartnerId,
}: PendingInvoiceGrouping) => {
  const params = new URLSearchParams();

  if (toPartnerId) {
    params.set("toPartnerId", toPartnerId);
  } else if (toOrganisationId) {
    params.set("toOrganisationId", toOrganisationId);
  }

  return params;
};
