**User**

http://localhost:3000/admin/settings?tab=vehicleFuel

the modal needs update in reference to recent addition of fuel category, in জ্বালানীর ধরণ field, show fuel category instead of fuel names, and save data accordingly. there can be many fuel, but type are only these two

**Assistant**

Before I change the modal, one thing blocks me — and it's a data question only you can settle.

Right now the fuel dropdown's selection **is** what picks the per-litre price:

```
ref_fuel_types:  অকটেন ১৬৫৳   পেট্রোল ১৬০৳   ডিজেল ১৩৫৳   সিএনজি ৪৫৳
```

`admin_vehicle_config.fuel_type_id` → the engine reads `ctx.rates[rate_key]` to price the vehicle's litres ([calculate.ts](file:///c:/App/ird-budget/src/lib/budget/calculate.ts#L280-L303)). If the config stores only the category (তেল / গ্যাস), the engine can no longer tell **which** oil price (১৬০ / ১৬৫ / ১৩৫) to use for that vehicle.

So "save the category instead" also decides where the price lives.

I'll investigate the current state of the vehicle-fuel tab and its related actions/types.

Let me look at the schema and the admin-settings actions to understand the data model.

Let me see how vehicle config is consumed by the budget engine.

I've mapped the current design. Two things matter here:

- The admin modal at [tab-vehicle-fuel.tsx](file:///c:/App/ird-budget/src/app/(admin)/admin/settings/_components/tab-vehicle-fuel.tsx#L181-L202) lists individual fuels (`ref_fuel_types`) in its "জ্বালানির ধরন" field, and saves `admin_vehicle_config.fuel_type_id`.
- The office-side [form-7-client.tsx](file:///c:/App/ird-budget/src/app/(office)/office/form-7/form-7-client.tsx#L92-L101) also picks a specific fuel name and resolves the config by `car_type_id + fuel_type_id`; the budget engine in [fetcher.ts](file:///c:/App/ird-budget/src/lib/budget/fetcher.ts#L211-L227) then takes **both** the price (`rate_key`) and the economic code (`fuel_category`) from that specific fuel.

So switching the admin config to key on the fuel **category** (তেল/গ্যাস) changes the relationship from `vehicle_type + fuel` → `vehicle_type + category`, which ripples into form-7 and the engine. I want to confirm the office-side behavior before touching the schema.

Office keeps the exact fuel. Let me gather the remaining files I'll need to touch.

---

