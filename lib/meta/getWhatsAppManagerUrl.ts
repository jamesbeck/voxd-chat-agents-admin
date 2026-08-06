type WhatsAppManagerIds = {
  businessId?: string | null;
  assetId?: string | null;
};

export function getWhatsAppManagerUrl({
  businessId,
  assetId,
}: WhatsAppManagerIds): string | null {
  if (!businessId || !assetId) {
    return null;
  }

  const params = new URLSearchParams({
    business_id: businessId,
    asset_id: assetId,
  });

  return `https://business.facebook.com/latest/whatsapp_manager/overview?${params.toString()}`;
}
