import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { parsePedido } from '@/lib/pedido';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    fecha, cliente_nombre, cliente_numero, localidad, pedido,
    facturacion, ganancia, estado, vendedor
  } = body;

  if (!fecha || !cliente_nombre || !pedido) {
    return NextResponse.json({ error: 'fecha, cliente_nombre y pedido son requeridos' }, { status: 400 });
  }

  const items = parsePedido(pedido);

  const { data, error } = await supabase.rpc('registrar_venta', {
    p_fecha: fecha,
    p_cliente_nombre: cliente_nombre,
    p_cliente_numero: cliente_numero ?? null,
    p_localidad: localidad ?? null,
    p_pedido: pedido,
    p_facturacion: facturacion ?? 0,
    p_ganancia: ganancia ?? 0,
    p_estado: estado ?? 'Pendiente',
    p_vendedor: vendedor ?? null,
    p_items: items
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
