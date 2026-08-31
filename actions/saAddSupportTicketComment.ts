"use server";

import db from "../database/db";
import { ServerActionResponse } from "@/types/types";
import { verifyAccessToken } from "@/lib/auth/verifyToken";
import sendgrid from "@sendgrid/mail";
import { addLog } from "@/lib/addLog";

// Extract mentioned user IDs from comment text
// Mentions are stored as @[Display Name](userId)
function extractMentionedUserIds(comment: string): string[] {
  const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
  const userIds: string[] = [];
  let match;
  while ((match = mentionRegex.exec(comment)) !== null) {
    userIds.push(match[2]);
  }
  return userIds;
}

// Convert mention format to readable text for emails
function formatCommentForEmail(comment: string): string {
  return comment.replace(/@\[([^\]]+)\]\(([^)]+)\)/g, "@$1");
}

const saAddSupportTicketComment = async ({
  ticketId,
  comment,
  reopenTicket = false,
}: {
  ticketId: string;
  comment: string;
  reopenTicket?: boolean;
}): Promise<ServerActionResponse> => {
  const accessToken = await verifyAccessToken();

  if (!comment?.trim()) {
    return { success: false, error: "Comment is required" };
  }

  // First verify access to the ticket and get full details
  const ticket = await db("supportTicket")
    .leftJoin("agent", "supportTicket.agentId", "agent.id")
    .leftJoin("organisation", function () {
      this.on("agent.organisationId", "=", "organisation.id").orOn(
        "supportTicket.organisationId",
        "=",
        "organisation.id",
      );
    })
    .leftJoin(
      "organisation as partnerOrganisation",
      "organisation.partnerId",
      "partnerOrganisation.id",
    )
    .where("supportTicket.id", ticketId)
    .select(
      "supportTicket.id",
      "supportTicket.ticketNumber",
      "supportTicket.title",
      "supportTicket.status",
      "organisation.partnerId",
      "organisation.id as organisationId",
      "partnerOrganisation.domain as partnerDomain",
      "partnerOrganisation.name as partnerName",
      "partnerOrganisation.sendEmailFromDomain",
      "agent.niceName as agentName",
    )
    .first();

  if (!ticket) {
    return { success: false, error: "Ticket not found" };
  }

  // Check access control
  if (!accessToken.superAdmin) {
    if (accessToken.partner) {
      const ownsViaPartner = ticket.partnerId === accessToken.partnerId;
      const ownsViaOrg =
        accessToken.organisationId &&
        ticket.organisationId === accessToken.organisationId;
      if (!ownsViaPartner && !ownsViaOrg) {
        return {
          success: false,
          error: "You don't have access to this ticket",
        };
      }
    } else {
      if (ticket.organisationId !== accessToken.organisationId) {
        return {
          success: false,
          error: "You don't have access to this ticket",
        };
      }
    }
  }

  try {
    // Check if ticket is closed and should be reopened
    const wasClosed = ticket.status?.toLowerCase() === "closed";

    if (wasClosed && reopenTicket) {
      await db("supportTicket")
        .where("id", ticketId)
        .update({ status: "Open" });

      // Log the status change
      await addLog({
        adminUserId: accessToken.adminUserId,
        event: "Update Support Ticket Status",
        description: `Ticket #${ticket.ticketNumber} manually reopened from Closed to Open via comment submission`,
        data: {
          entityType: "supportTicket",
          entityId: ticketId,
        },
      });
    }

    const [newComment] = await db("supportTicketComment")
      .insert({
        supportTicketId: ticketId,
        adminUserId: accessToken.adminUserId,
        comment: comment.trim(),
      })
      .returning(["id", "createdAt"]);

    // If ticket was closed and reopened, add a system comment about status change
    if (wasClosed && reopenTicket) {
      await db("supportTicketComment").insert({
        supportTicketId: ticketId,
        adminUserId: accessToken.adminUserId,
        comment: "Status changed to Open because of new comment",
      });
    }

    // Get commenter name for email
    const commenter = await db("adminUser")
      .where("id", accessToken.adminUserId)
      .select("name", "email")
      .first();
    const commenterName = commenter?.name || commenter?.email || "Unknown";

    // Send notification email
    try {
      sendgrid.setApiKey(process.env.SENDGRID_API_KEY!);

      const partnerDomain = ticket.partnerDomain || "voxd.ai";
      const partnerName = ticket.partnerName || "Voxd";
      const emailFromDomain = ticket.sendEmailFromDomain || "voxd.ai";
      const ticketUrl = `https://${partnerDomain}/support-tickets/${ticket.id}`;

      // Build recipient list
      const recipients: string[] = ["james.beck@voxd.ai"];

      // Also send to mentioned users
      const mentionedUserIds = extractMentionedUserIds(comment);
      if (mentionedUserIds.length > 0) {
        // Check if @all is mentioned
        const hasAllMention = mentionedUserIds.includes("__ALL__");

        if (hasAllMention) {
          // Notify all users in the organization (except the commenter)
          const allOrgUsers = await db("adminUser")
            .where(function () {
              this.where("adminUser.organisationId", ticket.organisationId);

              if (ticket.partnerId) {
                this.orWhere("adminUser.organisationId", ticket.partnerId);
              }

              this.orWhere("adminUser.superAdmin", true);
            })
            .andWhere("id", "!=", accessToken.adminUserId)
            .select("email");
          allOrgUsers.forEach((user) => {
            if (user.email && !recipients.includes(user.email)) {
              recipients.push(user.email);
            }
          });
        }

        // Add specifically mentioned users (excluding __ALL__)
        const specificUserIds = mentionedUserIds.filter(
          (id) => id !== "__ALL__",
        );
        if (specificUserIds.length > 0) {
          const mentionedUsers = await db("adminUser")
            .whereIn("id", specificUserIds)
            .select("email");
          mentionedUsers.forEach((user) => {
            if (user.email && !recipients.includes(user.email)) {
              recipients.push(user.email);
            }
          });
        }
      }

      const formattedComment = formatCommentForEmail(comment.trim());

      // Remove the commenter from recipients so they don't get notified of their own comment
      const finalRecipients = recipients.filter(
        (email) => email !== commenter?.email,
      );

      // Only send email if there are recipients after filtering
      if (finalRecipients.length === 0) {
        return {
          success: true,
          data: newComment,
        };
      }

      await sendgrid.send({
        from: `${partnerName} Support <support@${emailFromDomain}>`,
        to: finalRecipients,
        subject: `New Comment on Ticket #${ticket.ticketNumber}: ${ticket.title}`,
        html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>New Comment on Support Ticket</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
            <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
              <tr>
                <td align="center" style="padding: 40px 0;">
                  <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <tr>
                      <td style="padding: 40px 40px 20px 40px; text-align: center;">
                        <h1 style="margin: 0; color: #333333; font-size: 24px; font-weight: 600;">New Comment on Support Ticket</h1>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 0 40px 20px 40px;">
                        <p style="margin: 0 0 20px 0; color: #555555; font-size: 16px; line-height: 1.5;">${commenterName} added a new comment:</p>
                        
                        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                          <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #eeeeee; color: #888888; font-size: 14px; width: 120px;">Ticket #</td>
                            <td style="padding: 10px; border-bottom: 1px solid #eeeeee; color: #333333; font-size: 14px; font-weight: 600;">${
                              ticket.ticketNumber
                            }</td>
                          </tr>
                          <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #eeeeee; color: #888888; font-size: 14px;">Title</td>
                            <td style="padding: 10px; border-bottom: 1px solid #eeeeee; color: #333333; font-size: 14px;">${
                              ticket.title
                            }</td>
                          </tr>
                          ${
                            ticket.agentName
                              ? `<tr>
                            <td style="padding: 10px; border-bottom: 1px solid #eeeeee; color: #888888; font-size: 14px;">Agent</td>
                            <td style="padding: 10px; border-bottom: 1px solid #eeeeee; color: #333333; font-size: 14px;">${ticket.agentName}</td>
                          </tr>`
                              : ""
                          }
                        </table>

                        <p style="margin: 0 0 10px 0; color: #888888; font-size: 14px;">Comment:</p>
                        <div style="background-color: #f8f9fa; border-radius: 6px; padding: 15px; margin-bottom: 20px;">
                          <p style="margin: 0; color: #333333; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${formattedComment}</p>
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
        text: `New Comment on Support Ticket #${
          ticket.ticketNumber
        }\n\n${commenterName} added a new comment:\n\nTicket #: ${
          ticket.ticketNumber
        }\nTitle: ${ticket.title}${
          ticket.agentName ? `\nAgent: ${ticket.agentName}` : ""
        }\n\nComment:\n${formattedComment}\n\nView ticket: ${ticketUrl}`,
      });
    } catch (emailError) {
      // Log but don't fail the comment creation if email fails
      console.error(
        "Failed to send support ticket comment notification email:",
        emailError,
      );
    }

    return {
      success: true,
      data: newComment,
    };
  } catch (error: any) {
    console.error("Error adding comment:", error);
    return {
      success: false,
      error: error?.message || "Failed to add comment",
    };
  }
};

export default saAddSupportTicketComment;
