/**
 * Supabase Schema Notes
 * 
 * Existing tables (Extracted from legacy code analysis):
 * - `form_basic`: office head, designation, phone, email, address
 * - `form_staff`: grade_id, count, total_basic, due_salary, suspended_count, suspended_total_basic, suspended_due_salary
 * - `form_allowances`: allowance_type_id, count, total_basic, amount, due
 * - `form_leave`: leave encashment (officer/staff basic and due), rest and recreation (amount and due)
 * - `form_vehicles`: vehicle_fuel_config_id, count, maintenance_cost, additional_expense
 * - `form_vehicle_rent`: vehicle_rent_config_id, count
 * - `form_it_equipment`: equipment_type_id, existing_count, damaged_count, monthly_toner_cost, required_qty, unit_budget
 * - `form_utility`: utility_type_id, annual_cost, due
 * - `form_house_rent`: monthly_bill, due, contract_start_date, contract_end_date
 * - `form_return_info`: tin_count, return_submitted_count
 * 
 * - `expense_codes`: budget codes configuration, active status, parent code, title, sort_order
 * - `budget_sheet`: stores auto_value and manual_value for expense codes per submission
 * - `submissions`: tracks status ('draft', 'submitted'), office_id, cycle_id
 * 
 * Notes on RLS:
 * - All modifications to the schema and RLS policies (if any) should be documented here.
 * - Svelte codebase relied heavily on `sessionStorage` for `submission_id`, `office_id` and `cycle_id`.
 * - In Next.js, this will be handled via Server Actions and encrypted cookies or server session.
 * 
 * Future Schema Changes Needed:
 * - [ ] Ensure `budget_sheet` uniqueness constraint on `(submission_id, code_id)`
 * - [ ] Move session details (`submission_id`, etc.) to a proper sessions table or JWT claims if not purely relying on server sessions.
 */
