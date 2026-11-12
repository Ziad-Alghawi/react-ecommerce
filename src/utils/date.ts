import dayjs from 'dayjs';

export function formatDeliveryDate(timeMs: number) {
  return dayjs(timeMs).format('dddd, MMMM D');
}

export function formatDate(date: string) {
  return dayjs(date).format('MMMM D, YYYY');
}

export function formatDeliveryStatus(deliveryTimeMs: number) {
  const status = deliveryTimeMs <= Date.now() ? 'Delivered on' : 'Arriving on';
  return `${status} ${formatDeliveryDate(deliveryTimeMs)}`;
}
