import db from "@/database/db";
import { verifyAccessToken } from "@/lib/auth/verifyToken";
import { getPartnerTreeIdsSubquery } from "@/lib/organisationAccess";
import { AccessTokenPayload } from "@/types/tokenTypes";
import { Knex } from "knex";

const buildVisibleOrganisationScopeSubquery = ({
  accessToken,
  organisationIdReference,
  trx,
}: {
  accessToken: AccessTokenPayload;
  organisationIdReference: string;
  trx: Knex | Knex.Transaction;
}) => {
  const scopedOrganisationQuery = trx("organisation")
    .select("organisation.id")
    .whereRaw(`"organisation"."id" = ${organisationIdReference}`);

  if (accessToken.superAdmin) {
    return scopedOrganisationQuery;
  }

  if (accessToken.partner && accessToken.partnerId) {
    const partnerTreeIds = getPartnerTreeIdsSubquery({
      rootPartnerId: accessToken.partnerId,
      trx,
    });

    scopedOrganisationQuery.where((branchScope) => {
      branchScope
        .whereRaw('"organisation"."id" in (?)', [partnerTreeIds])
        .orWhereRaw('"organisation"."partnerId" in (?)', [partnerTreeIds]);
    });

    return scopedOrganisationQuery;
  }

  return scopedOrganisationQuery.whereExists(
    function whereMemberOfOrganisation() {
      this.select("adminUser.id")
        .from("adminUser")
        .whereRaw('"adminUser"."organisationId" = "organisation"."id"')
        .where("adminUser.id", accessToken.adminUserId);
    },
  );
};

const applyNoRowsScope = (query: Knex.QueryBuilder) => query.whereRaw("1 = 0");

export const applyInvoiceReadScope = async ({
  query,
  accessToken,
  invoiceTableAlias = "invoice",
  trx = db,
}: {
  query: Knex.QueryBuilder;
  accessToken: AccessTokenPayload;
  invoiceTableAlias?: string;
  trx?: Knex | Knex.Transaction;
}) => {
  if (accessToken.superAdmin) {
    return query;
  }

  if (!accessToken.partner && !accessToken.organisationId) {
    return applyNoRowsScope(query);
  }

  const scopedOrganisationQuery = buildVisibleOrganisationScopeSubquery({
    accessToken,
    organisationIdReference: `"${invoiceTableAlias}"."toOrganisationId"`,
    trx,
  });

  return query.whereExists(scopedOrganisationQuery);
};

export const applyInvoiceLineItemReadScope = async ({
  query,
  accessToken,
  lineItemTableAlias = "invoiceLineItem",
  trx = db,
}: {
  query: Knex.QueryBuilder;
  accessToken: AccessTokenPayload;
  lineItemTableAlias?: string;
  trx?: Knex | Knex.Transaction;
}) => {
  if (accessToken.superAdmin) {
    return query;
  }

  if (!accessToken.partner && !accessToken.organisationId) {
    return applyNoRowsScope(query);
  }

  return query.where((scopedQuery) => {
    scopedQuery
      .whereExists(
        buildVisibleOrganisationScopeSubquery({
          accessToken,
          organisationIdReference: `"${lineItemTableAlias}"."toOrganisationId"`,
          trx,
        }),
      )
      .orWhereExists(
        buildVisibleOrganisationScopeSubquery({
          accessToken,
          organisationIdReference: '"agent"."organisationId"',
          trx,
        })
          .innerJoin("agent", "agent.organisationId", "organisation.id")
          .whereRaw(`"agent"."id" = "${lineItemTableAlias}"."agentId"`),
      )
      .orWhereExists(
        buildVisibleOrganisationScopeSubquery({
          accessToken,
          organisationIdReference: '"invoice"."toOrganisationId"',
          trx,
        })
          .innerJoin("invoice", "invoice.toOrganisationId", "organisation.id")
          .whereRaw(`"invoice"."id" = "${lineItemTableAlias}"."invoiceId"`),
      );
  });
};

export const userCanViewInvoice = async ({
  invoiceId,
  accessToken,
  trx = db,
}: {
  invoiceId: string;
  accessToken?: AccessTokenPayload;
  trx?: Knex | Knex.Transaction;
}) => {
  const resolvedAccessToken = accessToken ?? (await verifyAccessToken());

  const query = trx("invoice").where("invoice.id", invoiceId);

  await applyInvoiceReadScope({
    query,
    accessToken: resolvedAccessToken,
    trx,
  });

  const invoice = await query.select("invoice.id").first();

  return !!invoice;
};

export const userCanViewInvoiceLineItem = async ({
  lineItemId,
  accessToken,
  trx = db,
}: {
  lineItemId: string;
  accessToken?: AccessTokenPayload;
  trx?: Knex | Knex.Transaction;
}) => {
  const resolvedAccessToken = accessToken ?? (await verifyAccessToken());

  const query = trx("invoiceLineItem").where("invoiceLineItem.id", lineItemId);

  await applyInvoiceLineItemReadScope({
    query,
    accessToken: resolvedAccessToken,
    trx,
  });

  const lineItem = await query.select("invoiceLineItem.id").first();

  return !!lineItem;
};

export const canAccessBillingPages = async ({
  accessToken,
}: {
  accessToken?: AccessTokenPayload;
}) => {
  const resolvedAccessToken = accessToken ?? (await verifyAccessToken());

  return resolvedAccessToken.superAdmin;
};

export const canMutateBillingRecords = async ({
  accessToken,
}: {
  accessToken?: AccessTokenPayload;
}) => {
  return canAccessBillingPages({ accessToken });
};
