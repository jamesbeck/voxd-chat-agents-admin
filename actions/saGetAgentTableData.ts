"use server";

import db from "../database/db";
import { verifyAccessToken } from "@/lib/auth/verifyToken";
import {
  ServerActionReadResponse,
  ServerActionReadParams,
} from "@/types/types";

const saGetAgentTableData = async ({
  search,
  page = 1,
  pageSize = 100,
  sortField = "id",
  sortDirection = "asc",
  organisationId,
}: ServerActionReadParams & {
  organisationId?: string;
}): Promise<ServerActionReadResponse> => {
  const accessToken = await verifyAccessToken();

  const base = db("agent")
    .leftJoin("chatUser", "agent.id", "chatUser.agentId")
    .leftJoin("session", "chatUser.id", "session.userId")
    .leftJoin("userMessage", "session.id", "userMessage.sessionId")
    .leftJoin("phoneNumber", "agent.phoneNumberId", "phoneNumber.id")
    .leftJoin("waba", "phoneNumber.wabaId", "waba.id")
    .leftJoin("metaBusiness", "waba.metaBusinessId", "metaBusiness.id")
    .leftJoin("organisation", "agent.organisationId", "organisation.id")
    .leftJoin(
      "organisation as partnerOrganisation",
      "organisation.partnerId",
      "partnerOrganisation.id",
    )
    .groupBy(
      "agent.id",
      "phoneNumber.id",
      "waba.id",
      "metaBusiness.id",
      "organisation.name",
      "organisation.partnerId",
      "partnerOrganisation.name",
    )
    .where((qb) => {
      if (search) {
        qb.where("agent.name", "ilike", `%${search}%`);
        qb.orWhere("agent.niceName", "ilike", `%${search}%`);
      }
    });

  // Apply access control based on user level
  // Regular organisation users can only see agents from their organisation
  if (!accessToken.partner && !accessToken.superAdmin) {
    if (accessToken.organisationId) {
      base.where("agent.organisationId", accessToken.organisationId);
    } else {
      // Regular user without organisationId should see nothing
      base.whereRaw("1 = 0");
    }
  }

  // Partners can see agents from organisations they manage OR their own organisation
  if (accessToken.partner && !accessToken.superAdmin) {
    base.where((qb) => {
      qb.where("organisation.partnerId", accessToken.partnerId);
      if (accessToken.organisationId) {
        qb.orWhere("agent.organisationId", accessToken.organisationId);
      }
    });
  }

  // Super admins can see all agents (no filter needed)

  // Additional filter by organisationId if provided (must still respect access control above)
  if (organisationId) {
    base.where("agent.organisationId", organisationId);
  }

  //count query
  const countQuery = base.clone().select("agent.id");
  const countResult = await db
    .count<{ count: string }>("id")
    .from(countQuery)
    .first();

  const totalAvailable = countResult ? parseInt(countResult.count) : 0;

  const agents = await base
    .clone()
    .select("agent.*")
    .select("phoneNumber.displayPhoneNumber as phoneNumber")
    .select("waba.metaId as whatsappBusinessAccountMetaId")
    .select("metaBusiness.metaId as metaBusinessMetaId")
    .select("organisation.name as organisationName")
    .select("organisation.partnerId as partnerId")
    .select("partnerOrganisation.name as partnerName")
    .select(
      db.raw(
        'COUNT(CASE WHEN "session"."sessionType" != \'development\' THEN "userMessage"."id" END)::int as "messageCount"',
      ),
      db.raw(
        `MAX(CASE WHEN "session"."sessionType" != 'development' THEN "userMessage"."createdAt" END) as "lastMessageAt"`,
      ),
      db.raw(
        'COUNT(DISTINCT CASE WHEN "session"."sessionType" != \'development\' THEN "session"."id" END)::int as "sessionCount"',
      ),
    )
    .orderByRaw(`?? ${sortDirection} NULLS LAST`, [sortField])
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return {
    success: true,
    data: agents,
    totalAvailable,
    page,
    pageSize,
  };
};

export default saGetAgentTableData;
