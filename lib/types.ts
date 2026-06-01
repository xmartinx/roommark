// ---------------------------------------------------------------------------
// Shared database row types — mirrors the Supabase schema
// ---------------------------------------------------------------------------

export interface Property {
  id: string;
  user_id: string;
  address: string;
  suburb: string;
  state: string;
  postcode: string;
  property_type: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  landlord_name: string | null;
  landlord_email: string | null;
  landlord_phone: string | null;
  tenant_name: string | null;
  tenant_email: string | null;
  tenant_phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface Inspection {
  id: string;
  user_id: string;
  property_id: string;
  inspection_type: 'ingoing' | 'routine' | 'outgoing';
  state: string;
  status: 'draft' | 'complete' | 'sent';
  inspector_name: string;
  inspection_date: string;
  inspection_time: string | null;
  ingoing_id: string | null;
  keys_issued: number | null;
  keys_returned: number | null;
  water_meter: string | null;
  gas_meter: string | null;
  electricity_meter: string | null;
  overall_notes: string | null;
  pdf_url: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Inspection row joined with its parent property */
export interface InspectionWithProperty extends Inspection {
  property: Property | null;
}

// ---------------------------------------------------------------------------
// Insert / update types (omit server-generated fields)
// ---------------------------------------------------------------------------

export type PropertyInsert = Omit<Property, 'id' | 'created_at' | 'updated_at'>;
