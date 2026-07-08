import { Knex } from "knex";

const getNextInvoiceNumber = async ({ trx }: { trx: Knex.Transaction }) => {
  const latestInvoice = await trx("invoice")
    .select(trx.raw('CAST("number" AS INTEGER) as "numericNumber"'))
    .whereRaw('"number" ~ ?', ["^[0-9]+$"])
    .orderByRaw('CAST("number" AS INTEGER) DESC')
    .forUpdate()
    .first<{ numericNumber: number | string }>();

  return Number(latestInvoice?.numericNumber ?? 0) + 1;
};

export default getNextInvoiceNumber;
