export interface PedidoItem {
  nombre: string;
  cantidad: number;
}

export function parsePedido(pedido: string): PedidoItem[] {
  if (!pedido) return [];
  return pedido
    .split(',')
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => {
      const m = p.match(/^(\d+)\s+(.+)$/);
      return m ? { nombre: m[2].trim(), cantidad: parseInt(m[1]) || 1 } : { nombre: p, cantidad: 1 };
    });
}
