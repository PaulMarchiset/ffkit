interface Props {
  size?: number;
  stroke?: string;
}

export function UploadIcon({ size = 40, stroke = "#87867E" }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M21 3H3M6 13L12 7L18 13M12 7V21" stroke={stroke} stroke-width="1" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  );
}
