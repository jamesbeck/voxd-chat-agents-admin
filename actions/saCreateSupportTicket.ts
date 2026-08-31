"use server";

import db from "../database/db";
import { ServerActionResponse } from "@/types/types";
import { verifyAccessToken } from "@/lib/auth/verifyToken";
import sendgrid from "@sendgrid/mail";

type CreateSupportTicketInput = {
  agentId?: string;
  title: string;
  description: string;
  messageId?: string;
  messageType?: "user" | "assistant";
  sessionId?: string;
};

const saCreateSupportTicket = async (
  input: CreateSupportTicketInput,
): Promise<ServerActionResponse> => {
  const accessToken = await verifyAccessToken();

  const { agentId, title, description, messageId, messageType, sessionId } =
    input;

  if (!title?.trim() || !description?.trim()) {
    return {
      success: false,
      error: "Title and description are required",
    };
  }

  let organisationId: string;
  let agent: any = null;

  // If agentId is provided, fetch agent and organisation info
  if (agentId) {
    // Verify user has access to this agent
    agent = await db("agent")
      .leftJoin("organisation", "agent.organisationId", "organisation.id")
      .leftJoin(
        "organisation as partnerOrganisation",
        "organisation.partnerId",
        "partnerOrganisation.id",
      )
      .where("agent.id", agentId)
      .select(
        "agent.id",
        "agent.niceName",
        "organisation.partnerId",
        "organisation.id as organisationId",
        "partnerOrganisation.domain as partnerDomain",
        "partnerOrganisation.name as partnerName",
        "partnerOrganisation.sendEmailFromDomain",
      )
      .first();

    if (!agent) {
      return { success: false, error: "Agent not found" };
    }

    // Check access control
    if (!accessToken.superAdmin) {
      if (accessToken.partner) {
        const ownsViaPartner = agent.partnerId === accessToken.partnerId;
        const ownsViaOrg =
          accessToken.organisationId &&
          agent.organisationId === accessToken.organisationId;
        if (!ownsViaPartner && !ownsViaOrg) {
          return {
            success: false,
            error: "You don't have access to this agent",
          };
        }
      } else {
        if (agent.organisationId !== accessToken.organisationId) {
          return {
            success: false,
            error: "You don't have access to this agent",
          };
        }
      }
    }

    organisationId = agent.organisationId;
  } else {
    // No agentId - use organisationId from access token
    if (!accessToken.organisationId) {
      return {
        success: false,
        error: "Organisation ID is required",
      };
    }
    organisationId = accessToken.organisationId;
  }

  // Create the support ticket
  try {
    const insertData: Record<string, any> = {
      organisationId,
      adminUserId: accessToken.adminUserId,
      title: title.trim(),
      description,
      status: "Open",
    };

    // Add agentId if provided
    if (agentId) {
      insertData.agentId = agentId;
    }

    // Add sessionId if provided directly
    if (sessionId) {
      insertData.sessionId = sessionId;
    }

    // Add message reference and sessionId if provided
    if (messageId && messageType) {
      if (messageType === "user") {
        insertData.userMessageId = messageId;
        // Get sessionId from userMessage if not already set
        if (!sessionId) {
          const message = await db("userMessage")
            .where("id", messageId)
            .select("sessionId")
            .first();
          if (message?.sessionId) {
            insertData.sessionId = message.sessionId;
          }
        }
      } else if (messageType === "assistant") {
        insertData.assistantMessageId = messageId;
        // Get sessionId from assistantMessage if not already set
        if (!sessionId) {
          const message = await db("assistantMessage")
            .where("id", messageId)
            .select("sessionId")
            .first();
          if (message?.sessionId) {
            insertData.sessionId = message.sessionId;
          }
        }
      }
    }

    const [newTicket] = await db("supportTicket")
      .insert(insertData)
      .returning(["id", "ticketNumber", "title", "status", "createdAt"]);

    // Get reporter name for email
    const reporter = await db("adminUser")
      .where("id", accessToken.adminUserId)
      .select("name", "email")
      .first();
    const reporterName = reporter?.name || reporter?.email || "Unknown";

    // Get partner/organisation info for email if no agent
    let partnerDomain = "voxd.ai";
    let partnerName = "Voxd";
    let emailFromDomain = "voxd.ai";

    if (agent) {
      partnerDomain = agent.partnerDomain || "voxd.ai";
      partnerName = agent.partnerName || "Voxd";
      emailFromDomain = agent.sendEmailFromDomain || "voxd.ai";
    } else {
      // Fetch organisation/partner info if no agent
      const orgInfo = await db("organisation")
        .leftJoin(
          "organisation as partnerOrganisation",
          "organisation.partnerId",
          "partnerOrganisation.id",
        )
        .where("organisation.id", organisationId)
        .select(
          "partnerOrganisation.domain as partnerDomain",
          "partnerOrganisation.name as partnerName",
          "partnerOrganisation.sendEmailFromDomain",
        )
        .first();

      if (orgInfo) {
        partnerDomain = orgInfo.partnerDomain || "voxd.ai";
        partnerName = orgInfo.partnerName || "Voxd";
        emailFromDomain = orgInfo.sendEmailFromDomain || "voxd.ai";
      }
    }

    // Send notification email
    try {
      sendgrid.setApiKey(process.env.SENDGRID_API_KEY!);

      const ticketUrl = `https://${partnerDomain}/support-tickets/${newTicket.id}`;

      const agentRow = agent
        ? `<tr>
            <td style="padding: 10px; border-bottom: 1px solid #eeeeee; color: #888888; font-size: 14px;">Agent</td>
            <td style="padding: 10px; border-bottom: 1px solid #eeeeee; color: #333333; font-size: 14px;">${agent.niceName}</td>
          </tr>`
        : "";

      const agentTextLine = agent ? `\nAgent: ${agent.niceName}` : "";

      await sendgrid.send({
        from: `${partnerName} Support <support@${emailFromDomain}>`,
        to: ["james.beck@voxd.ai"],
        subject: `New Support Ticket #${newTicket.ticketNumber}: ${newTicket.title}`,
        html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>New Support Ticket</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
            <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
              <tr>
                <td align="center" style="padding: 40px 0;">
                  <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <tr>
                      <td style="padding: 40px 40px 20px 40px; text-align: center;">
                        <h1 style="margin: 0; color: #333333; font-size: 24px; font-weight: 600;">New Support Ticket</h1>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 0 40px 20px 40px;">
                        <p style="margin: 0 0 20px 0; color: #555555; font-size: 16px; line-height: 1.5;">A new support ticket has been created:</p>
                        
                        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                          <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #eeeeee; color: #888888; font-size: 14px; width: 120px;">Ticket #</td>
                            <td style="padding: 10px; border-bottom: 1px solid #eeeeee; color: #333333; font-size: 14px; font-weight: 600;">${newTicket.ticketNumber}</td>
                          </tr>
                          <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #eeeeee; color: #888888; font-size: 14px;">Title</td>
                            <td style="padding: 10px; border-bottom: 1px solid #eeeeee; color: #333333; font-size: 14px;">${newTicket.title}</td>
                          </tr>
                          ${agentRow}
                          <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #eeeeee; color: #888888; font-size: 14px;">Reported By</td>
                            <td style="padding: 10px; border-bottom: 1px solid #eeeeee; color: #333333; font-size: 14px;">${reporterName}</td>
                          </tr>
                          <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #eeeeee; color: #888888; font-size: 14px;">Status</td>
                            <td style="padding: 10px; border-bottom: 1px solid #eeeeee; color: #333333; font-size: 14px;">
                              <span style="background-color: #ef4444; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px;">Open</span>
                            </td>
                          </tr>
                        </table>

                        <p style="margin: 0 0 10px 0; color: #888888; font-size: 14px;">Description:</p>
                        <div style="background-color: #f8f9fa; border-radius: 6px; padding: 15px; margin-bottom: 20px;">
                          <p style="margin: 0; color: #333333; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${description}</p>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td align="center" style="padding: 0 40px 30px 40px;">
                        <a href="${ticketUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 14px; font-weight: 600;">View Ticket</a>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 20px 40px 40px 40px; border-top: 1px solid #eeeeee;">
                        <p style="margin: 0; color: #999999; font-size: 12px; line-height: 1.5;">This is an automated message from ${partnerName} Support.</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `,
        text: `New Support Ticket #${newTicket.ticketNumber}\n\nTitle: ${newTicket.title}${agentTextLine}\nReported By: ${reporterName}\nStatus: Open\n\nDescription:\n${description}\n\nView ticket: ${ticketUrl}`,
      });
    } catch (emailError) {
      // Log but don't fail the ticket creation if email fails
      console.error(
        "Failed to send support ticket notification email:",
        emailError,
      );
    }

    return {
      success: true,
      data: newTicket,
    };
  } catch (error: any) {
    console.error("Error creating support ticket:", error);
    return {
      success: false,
      error: error?.message || "Failed to create support ticket",
    };
  }
};

export default saCreateSupportTicket;
