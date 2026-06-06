Office Domain — Final Tables
departments
id, name
parent_offices
id, name, department_id
office_types
id, name, department_id, is_group_budget
offices
id, budget_id, name, parent_office_id, office_type_id


cycles
id, fiscal_year, budget_type (new/revised), status (open/closed), created_at

submissions
id, office_id, cycle_id, status (draft/submitted/needs_resubmit), submitted_at, created_at


form_staff 
submission_id,grade_id, count, total_basic, due_salary, suspended_count,suspended_total_basic, suspended_due_salary

grades
id, grade_no (1–20), category (officer / staff)


allowance_types
id, name (overtime, duty, dress, risk, hill), is_calculated (true for overtime/duty, false for manual ones), has_basic (true for overtime only), created_at

form_allowances
submission_id, allowance_type_id,count, total_basic (nullable), amount, due

form_leave
submission_id
leave_encashment_officer_basic
leave_encashment_officer_due
leave_encashment_staff_basic
leave_encashment_staff_due
rest_recreation_amount
rest_recreation_due

vehicle_types
id
name

fuel_types
id
name 


vehicle_fuel_config
id
car_type_id → car_types.id
fuel_type_id → fuel_types.id
monthly_fuel_allowance
fuel_rate
annual_lube_allowance
annual_maintenance_allowance (nullable)
UNIQUE(car_type_id, fuel_type_id)


form_vehicles
submission_id
vehicle_fuel_config_id → vehicle_fuel_config.id
count
maintenance_cost (nullable)
additional_expense (nullable)


vehicle_rent_config
id
car_type_id → car_types.id
monthly_rent_allowance
UNIQUE(car_type_id)


form_vehicle_rent
submission_id
vehicle_rent_config_id
count

it_items (SA managed)
id
name (Computer, Printer, Scanner, Accessories)
allotted_budget (nullable — accessories and lumpsum items have none)
has_toner (true for printers only)
is_lumpsum (true for accessories)

form_it_inventory (user filled — existing items)
id
submission_id
item_id → it_items.id
count
damaged
toner_price (nullable — printers only)

form_it_requirement (user filled — purchase requirement)
id
submission_id
item_id → it_items.id
required_quantity (nullable — null for lumpsum items)
total_amount

utility_types (SA managed)
id
name (Electricity, Water, Internet etc.)
form_utility (user filled)
id
submission_id
utility_type_id → utility_types.id
annual_cost
due

rates Table
id
key
value
description
updated_at

form_house_rent
id
submission_id
monthly_bill
due
contract_start_date
contract_end_date

form_return_info
id
submission_id
tin_count
return_submitted_count

expense_codes
id
code
name
formula_key (nullable)
is_manual
sort_order
active
code_type_mapping
id
code_id → expense_codes.id
office_type_id → office_types.id
budget_sheet
id
submission_id
code_id → expense_codes.id
auto_value
manual_value
updated_at