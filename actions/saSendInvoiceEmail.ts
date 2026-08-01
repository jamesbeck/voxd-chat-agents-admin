"use server";

import db from "@/database/db";
import { addLog } from "@/lib/addLog";
import {
  canMutateBillingRecords,
  userCanViewInvoice,
} from "@/lib/billingAccess";
import { verifyAccessToken } from "@/lib/auth/verifyToken";
import getInvoicePdfUrl from "@/lib/getInvoicePdfUrl";
import { ServerActionResponse } from "@/types/types";
import { Resend } from "resend";

const TEST_RECIPIENT = "james@jamesbeck.co.uk";
const REAL_SEND_BCC = "james.beck@voxd.ai";
const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.voxd.ai";

type SendMode = "real" | "test";

const parseBillingEmails = (billingEmails: string | null | undefined) => {
  if (!billingEmails) {
    return [];
  }

  return Array.from(
    new Set(
      billingEmails
        .split(/[\n,]+/)
        .map((entry) => entry.trim())
        .filter(Boolean),
    ),
  );
};

const getInvoiceEmailHtml = ({
  invoiceNumber,
  toName,
}: {
  invoiceNumber: string;
  toName: string;
}) => {
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice #${invoiceNumber}</title>
  </head>
  <body style="margin:0;padding:0;background:#f4f7fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#10213a;">
    <table role="presentation" style="width:100%;border-collapse:collapse;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" style="width:640px;max-width:100%;background:#ffffff;border:1px solid #e6ecf5;border-radius:12px;border-collapse:collapse;overflow:hidden;">
            <tr>
              <td style="padding:24px 28px;background:#00a9ff;color:#ffffff;">
                <div style="font-size:12px;letter-spacing:1px;text-transform:uppercase;opacity:0.85;">Voxd Billing</div>
                <h1 style="margin:8px 0 0 0;font-size:24px;line-height:1.2;font-weight:700;">Invoice #${invoiceNumber}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <p style="margin:0 0 12px 0;font-size:16px;line-height:1.5;">Hi ${toName},</p>
                <p style="margin:0 0 12px 0;font-size:16px;line-height:1.5;">Please find your Voxd invoice attached as a PDF.</p>
                <p style="margin:0 0 12px 0;font-size:16px;line-height:1.5;">If anything looks incorrect or you need help, please contact your account manager.</p>
                <p style="margin:0;font-size:13px;line-height:1.5;color:#5a6b85;">Please do not reply to this email.</p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:0 28px 28px 28px;">
                <img src="${appBaseUrl}/emailLogo.png" alt="Voxd" style="display:block;width:120px;max-width:100%;height:auto;opacity:0.9;" />
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;
};

const getInvoiceEmailText = ({ invoiceNumber }: { invoiceNumber: string }) => {
  return `Hi,

Please find your Voxd invoice #${invoiceNumber} attached as a PDF.

If anything looks incorrect or you need help, please contact your account manager.

Please do not reply to this email.

Voxd Billing`;
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown error";
};

const saSendInvoiceEmail = async ({
  invoiceId,
  mode,
}: {
  invoiceId: string;
  mode: SendMode;
}): Promise<ServerActionResponse> => {
  const accessToken = await verifyAccessToken();

  if (!(await canMutateBillingRecords({ accessToken }))) {
    return {
      success: false,
      error: "You do not have permission to send invoices",
    };
  }

  if (!(await userCanViewInvoice({ invoiceId, accessToken }))) {
    return {
      success: false,
      error: "Invoice not found",
    };
  }

  const invoice = await db("invoice")
    .leftJoin(
      "organisation as toOrganisation",
      "toOrganisation.id",
      "invoice.toOrganisationId",
    )
    .leftJoin(
      "organisation as toPartnerOrganisation",
      "toPartnerOrganisation.id",
      "invoice.toPartnerId",
    )
    .select(
      "invoice.id",
      "invoice.number",
      "invoice.toOrganisationId",
      "invoice.toPartnerId",
      "invoice.emailSentAt",
      "toOrganisation.name as toOrganisationName",
      "toOrganisation.billingEmails as toOrganisationBillingEmails",
      "toPartnerOrganisation.name as toPartnerName",
      "toPartnerOrganisation.billingEmails as toPartnerBillingEmails",
    )
    .where("invoice.id", invoiceId)
    .first<{
      id: string;
      number: number;
      toOrganisationId: string | null;
      toPartnerId: string | null;
      emailSentAt: string | Date | null;
      toOrganisationName: string | null;
      toOrganisationBillingEmails: string | null;
      toPartnerName: string | null;
      toPartnerBillingEmails: string | null;
    }>();

  if (!invoice) {
    return {
      success: false,
      error: "Invoice not found",
    };
  }

  const billingEmails =
    invoice.toOrganisationBillingEmails ?? invoice.toPartnerBillingEmails;

  const recipients =
    mode === "test" ? [TEST_RECIPIENT] : parseBillingEmails(billingEmails);

  if (mode === "real" && recipients.length === 0) {
    return {
      success: false,
      error:
        "This invoice target does not have billing emails configured. Add billing emails on the organisation billing tab before sending.",
    };
  }

  const pdfUrl = getInvoicePdfUrl({
    invoiceId: invoice.id,
    requestedByAdminUserId: accessToken.adminUserId,
  });

  let pdfResponse: Response;

  try {
    pdfResponse = await fetch(pdfUrl, { cache: "no-store" });
  } catch (error) {
    return {
      success: false,
      error: `Failed to fetch invoice PDF from ${pdfUrl}: ${getErrorMessage(error)}`,
    };
  }

  if (!pdfResponse.ok) {
    return {
      success: false,
      error: `Failed to fetch the invoice PDF (HTTP ${pdfResponse.status})`,
    };
  }

  const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer());
  const resend = new Resend(process.env.RESEND_API_KEY);

  const invoiceNumber = String(invoice.number);
  const toName = invoice.toOrganisationName || invoice.toPartnerName || "there";

  let resendResponse;

  try {
    resendResponse = await resend.emails.send({
      from: "Voxd Accounts <accounts@voxd.ai>",
      replyTo: "accounts@voxd.ai",
      to: recipients,
      bcc: mode === "real" ? [REAL_SEND_BCC] : undefined,
      subject:
        mode === "test"
          ? `[TEST] Voxd Invoice #${invoiceNumber}`
          : `Voxd Invoice #${invoiceNumber}`,
      html: getInvoiceEmailHtml({ invoiceNumber, toName }),
      text: getInvoiceEmailText({ invoiceNumber }),
      attachments: [
        {
          filename: `invoice-${invoiceNumber}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });
  } catch (error) {
    return {
      success: false,
      error: `Resend failed to send invoice email: ${getErrorMessage(error)}`,
    };
  }

  if (resendResponse.error) {
    return {
      success: false,
      error: resendResponse.error.message || "Failed to send invoice email",
    };
  }

  const emailSentAt = new Date();

  if (mode === "real") {
    await db("invoice").where({ id: invoice.id }).update({
      emailSentAt,
    });
  }

  await addLog({
    adminUserId: accessToken.adminUserId,
    event: mode === "real" ? "INVOICE_EMAIL_SENT" : "INVOICE_EMAIL_TEST_SENT",
    data: {
      invoiceId: invoice.id,
      invoiceNumber,
      mode,
      recipients,
      bcc: mode === "real" ? [REAL_SEND_BCC] : [],
      resendEmailId: resendResponse.data?.id,
      emailSentAt: mode === "real" ? emailSentAt.toISOString() : null,
    },
  });

  return {
    success: true,
    data: {
      emailSentAt: mode === "real" ? emailSentAt.toISOString() : null,
    },
  };
};

export default saSendInvoiceEmail;
