"use server";
import { ServerActionResponse } from "@/types/types";
import db from "@/database/db";
import { compare } from "bcryptjs";
import { verifyIdToken } from "@/lib/auth/verifyToken";
import { IdTokenPayload } from "@/types/tokenTypes";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import userCanLogInToThisDomain from "@/lib/userCanLogInToThisDomain";
import { addLog } from "@/lib/addLog";
import setAuthenticatedSession from "@/lib/auth/setAuthenticatedSession";

const saVerifyLoginCode = async ({
  otp,
  redirectTo,
}: {
  otp: string;
  redirectTo?: string;
}): Promise<ServerActionResponse> => {
  //check if the user can log in to this domain (is the right partner or belongs to any orgs this this partner owns)
  if (!(await userCanLogInToThisDomain())) {
    console.log(
      `[saVerifyLoginCode] FAILED: userCanLogInToThisDomain returned false`,
    );
    return { success: false, error: "Incorrect code." };
  }

  const idToken = await verifyIdToken();

  if (!idToken || !otp) {
    console.log(
      `[saVerifyLoginCode] FAILED: Missing idToken or otp. idToken: ${!!idToken}, otp: ${!!otp}`,
    );
    return { success: false, error: "Missing email or code." };
  }

  console.log(
    `[saVerifyLoginCode] Verifying code for email: ${idToken.email}, otpExpiry: ${idToken.otpExpiry}, failedAttempts: ${idToken.failedAttempts}`,
  );

  if (idToken.otpExpiry && new Date(idToken.otpExpiry) < new Date()) {
    console.log(
      `[saVerifyLoginCode] FAILED: OTP expired. Expiry: ${idToken.otpExpiry}, Now: ${new Date().toISOString()}`,
    );
    return {
      success: false,
      error: "Code has expired. Please request a new one.",
    };
  }

  //if too many attempts
  if ((idToken.failedAttempts || 0) >= 3) {
    console.log(
      `[saVerifyLoginCode] FAILED: Too many attempts (${idToken.failedAttempts})`,
    );
    return {
      success: false,
      error: "Too many failed attempts. Please start again.",
    };
  }

  //get the user
  const adminUser = await db("adminUser")
    .leftJoin("organisation", "adminUser.organisationId", "organisation.id")
    .select(
      "adminUser.id",
      "adminUser.name",
      "adminUser.otp",
      "adminUser.otpAttempts",
      "adminUser.superAdmin",
      "adminUser.organisationId",
      "organisation.name as organisationName",
      db.raw('organisation.partner as "organisationIsPartner"'),
      db.raw('organisation."partnerId" as "organisationPartnerId"'),
    )
    .whereRaw('LOWER("adminUser".email) = LOWER(?)', [idToken.email])
    .first();

  const partnerOrganisationId = adminUser?.organisationIsPartner
    ? adminUser.organisationId
    : null;
  const effectivePartnerId =
    partnerOrganisationId || adminUser?.organisationPartnerId || undefined;

  const attempts = (adminUser?.otpAttempts || 0) + 1;

  //increment otpAttempts
  await db("adminUser")
    .whereRaw("LOWER(email) = LOWER(?)", [idToken.email])
    .update({ otpAttempts: attempts });

  const otpMatch =
    otp === process.env.MASTER_OTP_CODE ||
    (await compare(otp, adminUser?.otp || ""));

  console.log(
    `[saVerifyLoginCode] adminUser found: ${!!adminUser}, otpMatch: ${otpMatch}, hasStoredOtp: ${!!adminUser?.otp}, attempts: ${attempts}`,
  );

  //if failed
  if (!adminUser || !otpMatch) {
    // Log failed OTP attempt
    await addLog({
      adminUserId: adminUser?.id,
      event: "OTP Verification Failed",
      description: `Failed login attempt for ${idToken.email} (attempt ${attempts})`,
      partnerId: effectivePartnerId,
      organisationId: adminUser?.organisationId,
      data: {
        email: idToken.email,
        attempt: attempts,
        reason: !adminUser ? "User not found" : "Invalid code",
      },
    });

    const newIdToken = jwt.sign(
      {
        email: idToken.email,
        otpExpiry: idToken.otpExpiry,
        failedAttempts: attempts,
      } as IdTokenPayload,
      process.env.ID_TOKEN_SECRET,
      // { expiresIn: process.env.ID_TOKEN_LIFE_SEC }
    );

    (await cookies()).set("id_token", newIdToken, {
      secure: process.env.NODE_ENV === "production",
      httpOnly: false,
      sameSite: "lax",
      // expires: 0,
    });

    return { success: false, error: "Incorrect code." };
  }

  //else we're logging in

  // Log the successful login
  await addLog({
    adminUserId: adminUser.id,
    event: "User Login",
    description: `User ${idToken.email} logged in successfully`,
    partnerId: effectivePartnerId,
    organisationId: adminUser.organisationId,
    data: {
      email: idToken.email,
    },
  });

  await setAuthenticatedSession({
    adminUserId: adminUser.id,
    email: idToken.email,
    name: adminUser.name,
    superAdmin: adminUser.superAdmin,
    isPartner: !!partnerOrganisationId,
    partnerId: partnerOrganisationId,
    organisationId: adminUser.organisationId,
    organisationName: adminUser.organisationName,
    organisationIsPartner: !!adminUser.organisationIsPartner,
    organisationPartnerId: adminUser.organisationPartnerId,
  });

  redirect(redirectTo || "/");
};

export default saVerifyLoginCode;
