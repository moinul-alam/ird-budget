import { z } from "zod";

// Form 1: Basic Information
// Captures office head, designation, phone, email, address
export const formBasicSchema = z.object({
  head_of_office: z.string().min(1, "Required"),
  designation: z.string().min(1, "Required"),
  phone: z.string().min(1, "Required"),
  email: z.string().email("Invalid email"),
  address: z.string().min(1, "Required"),
});
export type FormBasic = z.infer<typeof formBasicSchema>;

// Form 2: Staff Information
// Captures number of staff per grade, basic salary, due salary, and suspended staff stats
export const formStaffRowSchema = z.object({
  grade_id: z.number().int().positive(),
  count: z.number().int().nonnegative().default(0),
  total_basic: z.number().nonnegative().default(0),
  due_salary: z.number().nonnegative().default(0),
  suspended_count: z.number().int().nonnegative().default(0),
  suspended_total_basic: z.number().nonnegative().default(0),
  suspended_due_salary: z.number().nonnegative().default(0),
});
export type FormStaffRow = z.infer<typeof formStaffRowSchema>;

// Form 3: Allowances
// Captures allowances per type (e.g. overtime, duty, dress, risk)
export const formAllowanceRowSchema = z.object({
  allowance_type_id: z.number().int().positive(),
  count: z.number().int().nonnegative().default(0),
  total_basic: z.number().nonnegative().default(0),
  amount: z.number().nonnegative().default(0),
  due: z.number().nonnegative().default(0),
});
export type FormAllowanceRow = z.infer<typeof formAllowanceRowSchema>;

// Form 4: Leave Encashment & Rest/Recreation
// Captures officer/staff leave encashment and rest/recreation allowances
export const formLeaveSchema = z.object({
  leave_encashment_officer_basic: z.number().nonnegative().default(0),
  leave_encashment_officer_due: z.number().nonnegative().default(0),
  leave_encashment_staff_basic: z.number().nonnegative().default(0),
  leave_encashment_staff_due: z.number().nonnegative().default(0),
  rest_recreation_amount: z.number().nonnegative().default(0),
  rest_recreation_due: z.number().nonnegative().default(0),
});
export type FormLeave = z.infer<typeof formLeaveSchema>;

// Form 5: Vehicles
// Captures vehicle count and expenses per vehicle/fuel config
export const formVehicleRowSchema = z.object({
  vehicle_fuel_config_id: z.number().int().positive(),
  count: z.number().int().nonnegative().default(0),
  maintenance_cost: z.number().nonnegative().default(0),
  additional_expense: z.number().nonnegative().default(0),
});
export type FormVehicleRow = z.infer<typeof formVehicleRowSchema>;

// Form 6: Vehicle Rent
// Captures number of rented vehicles
export const formVehicleRentRowSchema = z.object({
  vehicle_rent_config_id: z.number().int().positive(),
  count: z.number().int().nonnegative().default(0),
});
export type FormVehicleRentRow = z.infer<typeof formVehicleRentRowSchema>;

// Form 7: IT Equipment
// Captures existing/damaged IT equipment and requirements
export const formITEquipmentRowSchema = z.object({
  equipment_type_id: z.number().int().positive(),
  existing_count: z.number().int().nonnegative().default(0),
  damaged_count: z.number().int().nonnegative().default(0),
  monthly_toner_cost: z.number().nonnegative().default(0),
  required_qty: z.number().int().nonnegative().default(0),
  unit_budget: z.number().nonnegative().default(0),
});
export type FormITEquipmentRow = z.infer<typeof formITEquipmentRowSchema>;

// Form 8: Utilities
// Captures annual cost and due for utilities (electricity, water, internet)
export const formUtilityRowSchema = z.object({
  utility_type_id: z.number().int().positive(),
  annual_cost: z.number().nonnegative().default(0),
  due: z.number().nonnegative().default(0),
});
export type FormUtilityRow = z.infer<typeof formUtilityRowSchema>;

// Form 9: House Rent
// Captures office building rent and contract dates
export const formHouseRentSchema = z.object({
  monthly_bill: z.number().nonnegative().default(0),
  due: z.number().nonnegative().default(0),
  contract_start_date: z.string().nullable(),
  contract_end_date: z.string().nullable(),
});
export type FormHouseRent = z.infer<typeof formHouseRentSchema>;

// Form 10: Return Info
// Captures TIN counts and return counts for postal expense
export const formReturnInfoSchema = z.object({
  tin_count: z.number().int().nonnegative().default(0),
  return_submitted_count: z.number().int().nonnegative().default(0),
});
export type FormReturnInfo = z.infer<typeof formReturnInfoSchema>;
