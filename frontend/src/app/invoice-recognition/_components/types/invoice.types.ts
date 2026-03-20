export interface Party {
  name: string | null;
  address: string | null;
  inn: string | null;
  vat_registration: string | null;
  vat_status: string | null;
  bank_account: string | null;
  mfo: string | null;
  director: string | null;
  accountant: string | null;
}

export interface InvoiceItem {
  index: number;
  name: string | null;
  catalog_code: string | null;
  catalog_name: string | null;
  unit: string | null;
  quantity: number | null;
  price: number | null;
  subtotal: number | null;
  vat_rate: number | null;
  vat_amount: number | null;
  total: number | null;
  origin: string | null;
}

export interface Totals {
  subtotal: number | null;
  vat_amount: number | null;
  total: number | null;
  total_text: string | null;
}

export interface Signature {
  number: string | null;
  datetime: string | null;
  signer: string | null;
  ip: string | null;
}

export interface Signatures {
  sent: Signature | null;
  confirmed: Signature | null;
}

export interface Invoice {
  document_type: string | null;
  number: string | null;
  date: string | null;
  contract_number: string | null;
  contract_date: string | null;
  status: string | null;
  didox_id: string | null;
  rouming_id: string | null;
  risk_level: string | null;
  supplier: Party | null;
  buyer: Party | null;
  items: InvoiceItem[];
  totals: Totals | null;
  signatures: Signatures | null;
}
