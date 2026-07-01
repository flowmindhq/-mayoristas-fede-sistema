import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { estado } = await req.json();

  if (!estado) {
    return NextResponse.json({ error: 'estado es requerido' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('ventas')
    .update({ estado })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 });
  }

  return NextResponse.json(data);
}
