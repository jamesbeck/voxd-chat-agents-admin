import db from "@/database/db";
import {
  applyOrganisationReadScope,
  getAccessiblePartnerFilterOptions,
} from "@/lib/organisationAccess";
import { AccessTokenPayload } from "@/types/tokenTypes";

export const getBillingLineItemFormOptions = async ({
  accessToken,
}: {
  accessToken: AccessTokenPayload;
}) => {
  const partnerOptions = await getAccessiblePartnerFilterOptions({
    accessToken,
  });

  const organisationQuery = db("organisation")
    .select("organisation.id", "organisation.name")
    .where("organisation.partner", false)
    .orderBy("organisation.name", "asc");

  await applyOrganisationReadScope({
    query: organisationQuery,
    accessToken,
  });

  const organisations = await organisationQuery;

  const agentQuery = db("agent")
    .leftJoin("organisation", "agent.organisationId", "organisation.id")
    .select(
      "agent.id",
      "agent.niceName",
      "agent.name",
      "organisation.name as organisationName",
    )
    .orderBy("agent.niceName", "asc")
    .orderBy("agent.name", "asc");

  const agents = await agentQuery;

  const agentOptions = agents.map((agent) => ({
    value: agent.id,
    label:
      agent.organisationName && (agent.niceName || agent.name)
        ? `${agent.niceName || agent.name} (${agent.organisationName})`
        : agent.niceName || agent.name || agent.id,
  }));

  const organisationOptions = organisations.map((organisation) => ({
    value: organisation.id,
    label: organisation.name,
  }));

  return {
    agentOptions,
    organisationOptions,
    partnerOptions,
  };
};
