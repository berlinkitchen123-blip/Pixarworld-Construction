
export enum ItemType {
  GOODS = 'Goods',
  SERVICE = 'Service'
}

export interface Item {
  id: string;
  type: ItemType;
  name: string;
  unit: string;
  hsnCode: string;
  saleRate: number;
  gstRate: number; 
}

export enum ProjectType {
  RESIDENTIAL = 'Resident',
  COMMERCIAL = 'Commercial',
  INDUSTRIAL = 'Industry'
}

export enum ProjectScope {
  TURNKEY = 'New Construction (Turnkey)',
  BOX_CONSTRUCTION = 'New Box Construction',
  RENOVATION = 'Renovation',
  INTERIOR_DESIGN = 'Interior Design'
}

export enum TileSize {
  S_1X1 = '1ft x 1ft',
  S_2X2 = '2ft x 2ft',
  S_2X4 = '2ft x 4ft',
  S_32X32 = '32in x 32in',
  S_12X18 = '12in x 18in',
  S_12X12 = '12in x 12in',
  S_8X12 = '8in x 12in'
}

export enum WindowType {
  SLIDING = 'Aluminum Sliding',
  OPENABLE = 'Wooden Openable',
  FIXED = 'Fixed Glass',
  UPVC = 'UPVC Sliding'
}

export enum DoorType {
  FLUSH = 'Flush Door',
  PANEL = 'Panel Door',
  TEAK = 'Teak Wood Door',
  PVC = 'PVC/WPC Door',
  MS_GATE = 'M.S. Safety Door'
}

export interface EstimateLineItem {
  itemId: string;
  itemName: string;
  lh: string; 
  wd: string; 
  unit: string;
  volume: number;
  rate: number;
  qty: number;
  total: number;
  gstRate: number;
  gstAmount: number;
}

export enum EstimateStatus {
  PENDING = 'Pending',
  CONVERTED = 'Converted',
  REJECTED = 'Rejected'
}

export interface Estimate {
  id: string;
  estimateNumber: string;
  date: string;
  customerName: string;
  phoneNumber: string;
  altMob?: string;
  email?: string;
  pan?: string;
  profession?: string;
  currentAddress: string;
  siteAddress: string;
  familyMember?: string;
  projectType: ProjectType;
  scope: ProjectScope;
  budget?: string;
  completionTime?: string;
  salaryIncome?: string;
  items: EstimateLineItem[];
  subTotal: number;
  gstExtra: number;
  gstCalculationMode: 'auto' | 'manual';
  discount: number; 
  discountValue: number; 
  discountType: 'amount' | 'percent';
  totalAmount: number;
  terms: string[];
  status: EstimateStatus;
  parentId?: string;
  version: number;
  createdAt: string;
}

export interface User {
  id: string;
  companyName: string;
  email: string;
  role: 'admin' | 'user';
  phone?: string;
  address?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  altPhone?: string;
  email?: string;
  address: string;
  siteAddress?: string;
  notes?: string;
  createdAt: string;
}

export enum FollowUpStatus {
  PENDING = 'Pending',
  COMPLETED = 'Completed',
  CANCELLED = 'Cancelled'
}

export interface FollowUp {
  id: string;
  customerId: string;
  customerName: string;
  date: string;
  time: string;
  reason: string;
  status: FollowUpStatus;
  notes?: string;
  createdAt: string;
}
