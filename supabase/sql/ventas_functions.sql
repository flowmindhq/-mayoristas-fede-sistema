-- Funciones RPC para registrar/editar/eliminar ventas y su impacto en stock
-- de forma atómica (supabase-js no soporta transacciones multi-statement
-- desde el cliente, así que la transacción vive en el propio Postgres function).
--
-- Ejecutar este archivo una vez en el SQL Editor de tu proyecto Supabase.

create or replace function registrar_venta(
  p_fecha date,
  p_cliente_nombre text,
  p_cliente_numero text,
  p_localidad text,
  p_pedido text,
  p_facturacion numeric,
  p_ganancia numeric,
  p_estado text,
  p_vendedor text,
  p_items jsonb
) returns ventas
language plpgsql
as $$
declare
  v_venta ventas;
  item jsonb;
begin
  insert into ventas (fecha, cliente_nombre, cliente_numero, localidad, pedido, facturacion, ganancia, estado, vendedor)
  values (p_fecha, p_cliente_nombre, p_cliente_numero, p_localidad, p_pedido, p_facturacion, p_ganancia, p_estado, p_vendedor)
  returning * into v_venta;

  for item in select * from jsonb_array_elements(p_items)
  loop
    update productos
    set stock = stock - (item->>'cantidad')::numeric
    where nombre = item->>'nombre';
  end loop;

  return v_venta;
end;
$$;

create or replace function editar_venta(
  p_id bigint,
  p_fecha date,
  p_cliente_nombre text,
  p_cliente_numero text,
  p_localidad text,
  p_pedido text,
  p_facturacion numeric,
  p_ganancia numeric,
  p_estado text,
  p_vendedor text,
  p_items_viejos jsonb,
  p_items_nuevos jsonb
) returns ventas
language plpgsql
as $$
declare
  v_venta ventas;
  item jsonb;
begin
  -- devolver stock de los items originales
  for item in select * from jsonb_array_elements(p_items_viejos)
  loop
    update productos
    set stock = stock + (item->>'cantidad')::numeric
    where nombre = item->>'nombre';
  end loop;

  -- descontar stock de los items nuevos
  for item in select * from jsonb_array_elements(p_items_nuevos)
  loop
    update productos
    set stock = stock - (item->>'cantidad')::numeric
    where nombre = item->>'nombre';
  end loop;

  update ventas
  set fecha = p_fecha,
      cliente_nombre = p_cliente_nombre,
      cliente_numero = p_cliente_numero,
      localidad = p_localidad,
      pedido = p_pedido,
      facturacion = p_facturacion,
      ganancia = p_ganancia,
      estado = p_estado,
      vendedor = p_vendedor
  where id = p_id
  returning * into v_venta;

  if not found then
    raise exception 'Venta % no encontrada', p_id;
  end if;

  return v_venta;
end;
$$;

create or replace function eliminar_venta(
  p_id bigint,
  p_items jsonb
) returns void
language plpgsql
as $$
declare
  item jsonb;
begin
  for item in select * from jsonb_array_elements(p_items)
  loop
    update productos
    set stock = stock + (item->>'cantidad')::numeric
    where nombre = item->>'nombre';
  end loop;

  delete from ventas where id = p_id;

  if not found then
    raise exception 'Venta % no encontrada', p_id;
  end if;
end;
$$;
