"use server";

import db from "../database/db";
import { ServerActionResponse } from "@/types/types";
import sendgrid from "@sendgrid/mail";

sendgrid.setApiKey(process.env.SENDGRID_API_KEY!);

const saSignQuoteContract = async ({
  quoteId,
  signOffName,
  signOffEmail,
  signOffPosition,
  ipAddress,
  userAgent,
}: {
  quoteId: string;
  signOffName: string;
  signOffEmail: string;
  signOffPosition: string;
  ipAddress: string | null;
  userAgent: string | null;
}): Promise<ServerActionResponse> => {
  if (!quoteId) {
    return {
      success: false,
      error: "Quote ID is required",
    };
  }

  if (!signOffName || signOffName.trim() === "") {
    return {
      success: false,
      fieldErrors: { signOffName: "Legal name is required" },
    };
  }

  if (!signOffEmail || signOffEmail.trim() === "") {
    return {
      success: false,
      fieldErrors: { signOffEmail: "Email address is required" },
    };
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(signOffEmail)) {
    return {
      success: false,
      fieldErrors: { signOffEmail: "Please enter a valid email address" },
    };
  }

  if (!signOffPosition || signOffPosition.trim() === "") {
    return {
      success: false,
      fieldErrors: { signOffPosition: "Position is required" },
    };
  }

  // Find the existing quote with organisation, partner, and owner details
  const existingQuote = await db("quote")
    .leftJoin("organisation", "quote.organisationId", "organisation.id")
    .leftJoin(
      "organisation as partnerOrganisation",
      "organisation.partnerId",
      "partnerOrganisation.id",
    )
    .leftJoin("adminUser", "quote.createdByAdminUserId", "adminUser.id")
    .where("quote.id", quoteId)
    .select(
      "quote.*",
      "organisation.name as organisationName",
      "partnerOrganisation.id as partnerId",
      "partnerOrganisation.name as partnerName",
      "partnerOrganisation.domain as partnerDomain",
      "partnerOrganisation.sendEmailFromDomain",
      "partnerOrganisation.salesEmail as partnerSalesEmail",
      "partnerOrganisation.legalName as partnerLegalName",
      "partnerOrganisation.companyNumber as partnerCompanyNumber",
      "partnerOrganisation.registeredAddress as partnerRegisteredAddress",
      "partnerOrganisation.goCardlessMandateLink as partnerGoCardlessMandateLink",
      "adminUser.name as ownerName",
      "adminUser.email as ownerEmail",
    )
    .first();

  if (!existingQuote) {
    return {
      success: false,
      error: "Quote not found",
    };
  }

  if (existingQuote.signOffDate) {
    return {
      success: false,
      error: "This proposal has already been signed",
    };
  }

  const signOffDate = new Date();

  // Update the quote with sign-off details
  await db("quote").where({ id: quoteId }).update({
    signOffName: signOffName.trim(),
    signOffEmail: signOffEmail.trim().toLowerCase(),
    signOffPosition: signOffPosition.trim(),
    signOffDate,
    signOffIPAddress: ipAddress,
    signOffUserAgent: userAgent,
  });

  // Send confirmation email
  const emailFromDomain = existingQuote.sendEmailFromDomain || "voxd.ai";
  const partnerDomain = existingQuote.partnerDomain || "voxd.ai";

  // Get all partner admin users for BCC
  const partnerAdmins = existingQuote.partnerId
    ? await db("adminUser")
        .where("organisationId", existingQuote.partnerId)
        .whereNotNull("email")
        .select("email")
    : [];
  const partnerAdminEmails = partnerAdmins.map(
    (admin: { email: string }) => admin.email,
  );
  const proposalUrl = `https://${partnerDomain}/proposals/${quoteId}`;
  const formattedDate = signOffDate.toLocaleString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });

  const recipientEmail =
    process.env.NODE_ENV === "development"
      ? "james@jamesbeck.co.uk"
      : signOffEmail.trim().toLowerCase();

  const emailHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center; border-bottom: 3px solid #16a34a;">
              <h1 style="margin: 0; color: #16a34a; font-size: 28px; font-weight: 600;">Contract Signed</h1>
              <p style="margin: 10px 0 0 0; color: #555555; font-size: 16px;">Confirmation of Agreement</p>
            </td>
          </tr>
          
          <!-- Proposal Info -->
          <tr>
            <td style="padding: 30px 40px 20px 40px;">
              <h2 style="margin: 0 0 10px 0; color: #333333; font-size: 20px; font-weight: 600;">${existingQuote.title}</h2>
              <p style="margin: 0; color: #555555; font-size: 14px;">
                Proposal for <strong>${existingQuote.organisationName}</strong>
              </p>
              <p style="margin: 10px 0 0 0;">
                <a href="${proposalUrl}" style="color: #2563eb; text-decoration: none; font-size: 14px;">View Proposal Online →</a>
              </p>
            </td>
          </tr>
          
          <!-- Signing Details -->
          <tr>
            <td style="padding: 20px 40px;">
              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f0fdf4; border-radius: 8px; border: 1px solid #bbf7d0;">
                <tr>
                  <td style="padding: 20px;">
                    <h3 style="margin: 0 0 15px 0; color: #166534; font-size: 16px; font-weight: 600;">Signing Details Recorded</h3>
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 5px 0; color: #6b7280; font-size: 14px; width: 120px;">Name:</td>
                        <td style="padding: 5px 0; color: #111827; font-size: 14px; font-weight: 500;">${signOffName.trim()}</td>
                      </tr>
                      <tr>
                        <td style="padding: 5px 0; color: #6b7280; font-size: 14px;">Email:</td>
                        <td style="padding: 5px 0; color: #111827; font-size: 14px; font-weight: 500;">${signOffEmail.trim().toLowerCase()}</td>
                      </tr>
                      <tr>
                        <td style="padding: 5px 0; color: #6b7280; font-size: 14px;">Position:</td>
                        <td style="padding: 5px 0; color: #111827; font-size: 14px; font-weight: 500;">${signOffPosition.trim()}</td>
                      </tr>
                      <tr>
                        <td style="padding: 5px 0; color: #6b7280; font-size: 14px;">Signed:</td>
                        <td style="padding: 5px 0; color: #111827; font-size: 14px; font-weight: 500;">${formattedDate}</td>
                      </tr>
                      <tr>
                        <td style="padding: 5px 0; color: #6b7280; font-size: 14px;">IP Address:</td>
                        <td style="padding: 5px 0; color: #111827; font-size: 14px; font-weight: 500;">${ipAddress || "Not recorded"}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Legal Confirmations -->
          <tr>
            <td style="padding: 20px 40px;">
              <h3 style="margin: 0 0 15px 0; color: #333333; font-size: 16px; font-weight: 600;">Confirmations Made</h3>
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; vertical-align: top; width: 24px;">
                    <span style="color: #16a34a; font-size: 16px;">✓</span>
                  </td>
                  <td style="padding: 8px 0; color: #555555; font-size: 14px; line-height: 1.5;">
                    Confirmed authority to sign on behalf of <strong>${existingQuote.organisationName}</strong>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; vertical-align: top; width: 24px;">
                    <span style="color: #16a34a; font-size: 16px;">✓</span>
                  </td>
                  <td style="padding: 8px 0; color: #555555; font-size: 14px; line-height: 1.5;">
                    Agreed to Terms of Service
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Next Steps -->
          <tr>
            <td style="padding: 20px 40px;">
              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #eff6ff; border-radius: 8px; border: 1px solid #bfdbfe;">
                <tr>
                  <td style="padding: 20px;">
                    <h3 style="margin: 0 0 15px 0; color: #1e40af; font-size: 16px; font-weight: 600;">Next Steps</h3>
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      ${
                        existingQuote.partnerGoCardlessMandateLink
                          ? `<tr>
                        <td style="padding: 8px 0; vertical-align: top; width: 24px;">
                          <span style="color: #1e40af; font-size: 16px;">1.</span>
                        </td>
                        <td style="padding: 8px 0; color: #555555; font-size: 14px; line-height: 1.5;">
                          <strong>Set up Direct Debit</strong><br>
                          Please sign the Direct Debit mandate to enable monthly billing:<br>
                          <a href="${existingQuote.partnerGoCardlessMandateLink}" style="color: #2563eb; text-decoration: none;">${existingQuote.partnerGoCardlessMandateLink}</a>
                        </td>
                      </tr>`
                          : ""
                      }
                      <tr>
                        <td style="padding: 8px 0; vertical-align: top; width: 24px;">
                          <span style="color: #1e40af; font-size: 16px;">${existingQuote.partnerGoCardlessMandateLink ? "2." : "1."}</span>
                        </td>
                        <td style="padding: 8px 0; color: #555555; font-size: 14px; line-height: 1.5;">
                          <strong>Pay Setup Fee</strong><br>
                          You will shortly receive an invoice for the setup fee. Please pay this by bank transfer to the account details provided on the invoice.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Legal Notice -->
          <tr>
            <td style="padding: 20px 40px 30px 40px;">
              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #fafafa; border-radius: 8px; border: 1px solid #e5e5e5;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 10px 0; color: #333333; font-size: 14px; font-weight: 600;">Legal Notice</p>
                    <p style="margin: 0; color: #666666; font-size: 13px; line-height: 1.6;">
                      This email serves as confirmation of your electronic signature and acceptance of the proposal and associated terms. 
                      By signing, you have entered into a legally binding agreement. This record includes your name, email address, 
                      position, IP address, and timestamp as evidence of your acceptance.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px 40px 40px; border-top: 1px solid #eeeeee;">
              <p style="margin: 0 0 5px 0; color: #333333; font-size: 14px; font-weight: 500;">${existingQuote.partnerName}</p>
              ${existingQuote.partnerLegalName ? `<p style="margin: 0 0 5px 0; color: #999999; font-size: 12px;">${existingQuote.partnerLegalName}</p>` : ""}
              ${existingQuote.partnerCompanyNumber ? `<p style="margin: 0 0 5px 0; color: #999999; font-size: 12px;">Company No: ${existingQuote.partnerCompanyNumber}</p>` : ""}
              ${existingQuote.partnerRegisteredAddress ? `<p style="margin: 0 0 5px 0; color: #999999; font-size: 12px;">${existingQuote.partnerRegisteredAddress}</p>` : ""}
              <p style="margin: 15px 0 0 0; color: #999999; font-size: 11px;">
                This is an automated confirmation email. Please retain this email for your records.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const emailText = `Contract Signed - Confirmation of Agreement

${existingQuote.title}
Proposal for ${existingQuote.organisationName}

View Proposal Online: ${proposalUrl}

SIGNING DETAILS RECORDED
------------------------
Name: ${signOffName.trim()}
Email: ${signOffEmail.trim().toLowerCase()}
Position: ${signOffPosition.trim()}
Signed: ${formattedDate}
IP Address: ${ipAddress || "Not recorded"}

CONFIRMATIONS MADE
------------------
✓ Confirmed authority to sign on behalf of ${existingQuote.organisationName}
✓ Agreed to Terms of Service

NEXT STEPS
----------
${
  existingQuote.partnerGoCardlessMandateLink
    ? `1. SET UP DIRECT DEBIT
Please sign the Direct Debit mandate to enable monthly billing:
${existingQuote.partnerGoCardlessMandateLink}

2. PAY SETUP FEE`
    : "1. PAY SETUP FEE"
}
You will shortly receive an invoice for the setup fee. Please pay this by bank transfer to the account details provided on the invoice.

LEGAL NOTICE
------------
This email serves as confirmation of your electronic signature and acceptance of the proposal and associated terms. By signing, you have entered into a legally binding agreement. This record includes your name, email address, position, IP address, and timestamp as evidence of your acceptance.

${existingQuote.partnerName}
${existingQuote.partnerLegalName || ""}
${existingQuote.partnerCompanyNumber ? `Company No: ${existingQuote.partnerCompanyNumber}` : ""}
${existingQuote.partnerRegisteredAddress || ""}

This is an automated confirmation email. Please retain this email for your records.`;

  try {
    await sendgrid.send({
      from: existingQuote.partnerSalesEmail
        ? `${existingQuote.partnerName} <${existingQuote.partnerSalesEmail}>`
        : existingQuote.ownerEmail
          ? `${existingQuote.ownerName || existingQuote.partnerName} <${existingQuote.ownerEmail}>`
          : `${existingQuote.partnerName} <noreply@${emailFromDomain}>`,
      replyTo:
        existingQuote.partnerSalesEmail ||
        existingQuote.ownerEmail ||
        `support@${emailFromDomain}`,
      to: [recipientEmail],
      bcc: ["james.beck@voxd.ai", ...partnerAdminEmails],
      subject: `Contract Signed: ${existingQuote.title}`,
      html: emailHtml,
      text: emailText,
    });
  } catch (error) {
    // Log the error but don't fail the signing - the contract is already saved
    console.error("Failed to send confirmation email:", error);
  }

  return { success: true };
};

export default saSignQuoteContract;
