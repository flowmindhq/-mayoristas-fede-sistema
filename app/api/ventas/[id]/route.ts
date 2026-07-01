import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { parsePedido } from '@/lib/pedido';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const {
    fecha, cliente_nombre, cliente_numero, localidad, pedido,
    facturacion, ganancia, estado, vendedor
  } = body;

  if (!fecha || !cliente_nombre || !pedido) {
    return NextResponse.json({ error: 'fecha, cliente_nombre y pedido son requeridos' }, { status: 400 });
  }

  const { data: ventaActual, error: fetchError } = await supabase
    .from('ventas')
    .select('pedido')
    .eq('id', id)
    .single();

  if (fetchError || !ventaActual) {
    return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 });
  }

  const itemsViejos = parsePedido(ventaActual.pedido);
  const itemsNuevos = parsePedido(pedido);

  const { data, error } = await supabase.rpc('editar_venta', {
    p_id: id,
    p_fecha: fecha,
    p_cliente_nombre: cliente_nombre,
    p_cliente_numero: cliente_numero ?? null,
    p_localidad: localidad ?? null,
    p_pedido: pedido,
    p_facturacion: facturacion ?? 0,
    p_ganancia: ganancia ?? 0,
    p_estado: estado ?? 'Pendiente',
    p_vendedor: vendedor ?? null,
    p_items_viejos: itemsViejos,
    p_items_nuevos: itemsNuevos
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data: ventaActual, error: fetchError } = await supabase
    .from('ventas')
    .select('pedido')
    .eq('id', id)
    .single();

  if (fetchError || !ventaActual) {
    return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 });
  }

  const items = parsePedido(ventaActual.pedido);

  const { error } = await supabase.rpc('eliminar_venta', {
    p_id: id,
    p_items: items
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
