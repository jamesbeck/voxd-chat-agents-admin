import gocardless, { Environments } from "gocardless-nodejs";

const resolveGoCardlessEnvironment = (accessToken: string) => {
  const configuredEnvironment =
    process.env.GC_ENVIRONMENT?.trim().toLowerCase();

  if (
    configuredEnvironment === "live" ||
    configuredEnvironment === "production"
  ) {
    return Environments.Live;
  }

  if (configuredEnvironment === "sandbox" || configuredEnvironment === "test") {
    return Environments.Sandbox;
  }

  if (accessToken.startsWith("live_")) {
    return Environments.Live;
  }

  return Environments.Sandbox;
};

export const getGoCardlessClient = () => {
  const accessToken = process.env.GC_ACCESS_TOKEN?.trim();

  if (!accessToken) {
    throw new Error("GC_ACCESS_TOKEN is not configured");
  }

  return gocardless(accessToken, resolveGoCardlessEnvironment(accessToken));
};
