const clp = new Intl.NumberFormat('es-CL', {
  style: 'currency', currency: 'CLP', maximumFractionDigits: 0,
});

export const formatPrice = (price: number | null) => price === null ? 'Por confirmar' : clp.format(price);
