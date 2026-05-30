interface Props {
  size?: number;
  stroke?: string;
}

export function UploadIcon({ size = 48, stroke = "#87867E" }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M32 32L24 24L16 32M24 24V42M40 33.4857C42.443 31.4681 44 28.4159 44 25C44 18.9249 39.0751 14 33 14C32.563 14 32.1541 13.772 31.9322 13.3955C29.3241 8.96967 24.5089 6 19 6C10.7157 6 4 12.7157 4 21C4 25.1322 5.67089 28.8742 8.3739 31.5871" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
