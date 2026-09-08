-- ARS pricing + finde viernes→domingo (noches vie+sáb) + availability hasta 2026-12-31
-- No pisa noches con reservas activas (pending hold vigente o confirmed).

update public.property set
  price_per_night = 77500,
  weekend_pack_price = 155000,
  currency = 'ARS',
  house_rules = 'No se aceptan mascotas. No fumar dentro del depto. Sin fiestas. Finde: check-in viernes, check-out domingo (2 noches). Findes largos/puentes se abren a parte. Check-in desde las 15:00, check-out hasta las 11:00. Respetá a los vecinos.';

do $$
declare
  d date := current_date;
  end_d date := '2026-12-31';
  dow int;
  desired text;
  protected boolean;
begin
  while d <= end_d loop
    dow := extract(dow from d)::int; -- 0=dom ... 5=vie 6=sab
    desired := case when dow in (5, 6) then 'available' else 'blocked' end;

    -- Noches cubiertas por reserva activa no se reescriben
    select exists (
      select 1
      from public.reservations r
      where (
          r.status = 'confirmed'
          or (
            r.status = 'pending'
            and r.hold_until is not null
            and r.hold_until > now()
          )
        )
        and d >= r.check_in
        and d < r.check_out
    ) into protected;

    if not protected then
      insert into public.availability (night_date, status)
      values (d, desired)
      on conflict (night_date) do update
        set status = excluded.status,
            updated_at = now()
      where public.availability.status is distinct from excluded.status;
    end if;

    d := d + 1;
  end loop;
end $$;
