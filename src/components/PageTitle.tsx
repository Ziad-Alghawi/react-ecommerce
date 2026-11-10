export const STORE_NAME = 'Ziad-Alghawi Store';

interface PageTitleProps {
  title?: string;
}

export function PageTitle({ title }: PageTitleProps) {
  return <title>{title ? `${title} | ${STORE_NAME}` : STORE_NAME}</title>;
}
