import { Knex } from "knex";

const getNextInvoiceNumber = async ({ trx }: { trx: Knex.Transaction }) => {
  const latestInvoice = await trx("invoice")
    .select("number")
    .orderBy("number", "desc")
    .forUpdate()
    .first<{ number: number }>();

  return (latestInvoice?.number ?? 0) + 1;
};

export default getNextInvoiceNumber;
