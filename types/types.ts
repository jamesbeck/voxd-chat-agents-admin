export type ServerActionResponse =
  | {
      success: true;
      data?: any;
    }
  | { success: false; error?: string; fieldErrors?: Record<string, string> };

export type ServerActionReadResponse =
  | {
      success: true;
      data: Record<string, any>[];
      totalAvailable: number;
      page: number;
      pageSize: number;
    }
  | {
      success: false;
      error?: string;
    };

export type ServerActionReadParams<TExtra = object> = {
  search?: string;
  page?: number;
  pageSize?: number;
  sortField?: string;
  sortDirection?: "asc" | "desc";
} & TExtra;

// Table Filter Types
export type TableFilterOption = {
  label: string;
  value: string;
};

export type TableFilterType = "select" | "switch";

export type TableFilterConfig = {
  /** Unique identifier for the filter, used as the key in filter values */
  name: string;
  /** Display label for the filter */
  label: string;
  /** Type of filter UI to render */
  type: TableFilterType;
  /** Default value for the filter */
  defaultValue: string | boolean;
  /** Static options for select filters */
  options?: TableFilterOption[];
  /** Async function to load options (for select filters with dynamic data) */
  loadOptions?: () => Promise<TableFilterOption[]>;
  /** Placeholder text for select filters */
  placeholder?: string;
};

export type TableFilterValues = Record<string, string | boolean>;

export type Roles = "admin" | "organisation" | "partner";

// Admin users - users who log into the admin dashboard
export interface AdminUser {
  id: string;
  name: string;
  email?: string;
  partnerId?: string;
  superAdmin?: boolean;
  organisationId?: string;
  organisationName?: string; // Joined from organisation table
  createdAt?: Date;
}

// Chat users - WhatsApp users who interact with agents
export interface ChatUser {
  id: string;
  name?: string;
  number: string;
  email?: string;
  externalId?: string;
  agentId: string;
  testingAgentId?: string;
  data?: Record<string, unknown>;
}

// Legacy User type - kept for backwards compatibility during migration
// @deprecated Use AdminUser or ChatUser instead
export interface User {
  id: string;
  name: string;
  number?: string;
  email?: string;
  role: Roles;
  createdAt: Date;
  partnerId?: string;
  testingAgentId?: string;
  organisationId?: string;
  agentId?: string;
  data?: Record<string, unknown>;
}

export interface Partner {
  id: string;
  name: string;
  domain: string;
  coreDomain?: string | null;
  providerApiKeyId?: string | null;
  sendEmailFromDomain?: string;
  salesBotName?: string;
  salesBotAgentId?: string;
  prototypingAgentId?: string | null;
  legalName?: string;
  companyNumber?: string;
  registeredAddress?: string;
  legalEmail?: string;
  goCardlessMandateLink?: string;
  salesEmail?: string;
  accountsEmail?: string;
  organisationId?: string | null;
  organisationPrimaryColour?: string | null;
  organisationLogoFileExtension?: string | null;
  organisationShowLogoOnColour?: string | null;
  effectivePartnerName?: string | null;
  effectivePartnerDomain?: string | null;
  effectivePartnerOrganisationId?: string | null;
  effectivePartnerPrimaryColour?: string | null;
  effectivePartnerLogoFileExtension?: string | null;
  effectivePartnerShowLogoOnColour?: string | null;
  effectivePartnerLegalName?: string | null;
  effectivePartnerCompanyNumber?: string | null;
  effectivePartnerRegisteredAddress?: string | null;
  effectivePartnerLegalEmail?: string | null;
  hourlyRate?: number | null;
  monthlyBaseFee?: number | null;
  monthlyPerIntegration?: number | null;
  sendEmailFromDomainVerified?: boolean | null;
}

export type CostingBreakdownTask = {
  name: string;
  hours: number;
  description: string;
};

export type CostingBreakdownIntegration = {
  name: string;
  tasks: CostingBreakdownTask[];
};

export type CostingBreakdown = {
  integrations: CostingBreakdownIntegration[];
  totalIntegrationTime: number;
  totalIntegrationCost: number;
  totalMonthly: number;
  costingCalculatedFrom: "concept" | "proposal";
};
