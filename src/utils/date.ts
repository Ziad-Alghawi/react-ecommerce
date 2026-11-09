import dayjs from 'dayjs';

export function formatDeliveryDate(timeMs: number) {
  return dayjs(timeMs).format('dddd, MMMM D');
}
