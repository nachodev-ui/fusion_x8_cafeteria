// Ubicación, horarios y servicios transcritos de IMG_0868.PNG e IMG_0869.PNG.
// Las imágenes no incluyen teléfono: sigue pendiente antes de habilitar envíos.
export const business = {
  name: 'Fusión x8',
  address: 'Av. Ejército Libertador 905, Puente Alto',
  addressReference: 'Esquina Domingo Tocornal, Ciudad del Sol.',
  neighborhood: 'Ciudad del Sol · Puente Alto',
  hours: 'Martes a domingo, de 15:30 a 22:00 hrs.',
  closedDays: 'Lunes cerrado.',
  amenities: [
    { icon: 'paw', title: 'Pet friendly en todo el local', description: 'Tu mascota es bienvenida, tanto adentro como en la terraza.' },
    { icon: 'terrace', title: 'Terraza exterior', description: 'Una pausa al aire libre para disfrutar sin apuro.' },
    { icon: 'heat', title: 'Calefacción en invierno', description: 'Para que el frío no se interponga en tu cafecito.' },
    { icon: 'baby', title: 'Sillas de bebé', description: 'Un espacio para venir también con los más pequeños.' },
  ],
  references: [
    { label: 'Ubicación y servicios', file: '/references/ubicacion-servicios.png' },
    { label: 'Horarios', file: '/references/horarios.png' },
  ],
  // Solo dígitos, con código de país. Ejemplo de formato: 56912345678.
  // Vacío mientras no se conozca el número real: la demo no envía pedidos.
  whatsappNumber: '',
  whatsappDisplay: '+56 9 XXXX XXXX',
  whatsappMessage: '¡Hola, Fusión x8! Me gustaría hacer un pedido ☕🍦',
  instagram: 'https://www.instagram.com/cafeteriafusionx8/',
  tiktok: 'https://www.tiktok.com/@cafeteriafusionx8',
};

export const whatsappReady = /^569\d{8}$/.test(business.whatsappNumber);
export const whatsappUrl = whatsappReady
  ? `https://wa.me/${business.whatsappNumber}?text=${encodeURIComponent(business.whatsappMessage)}`
  : '#pedido';
