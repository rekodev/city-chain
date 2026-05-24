type Props = {
  size?: number;
  className?: string;
};

export default function Logo({ size = 24, className }: Props) {
  return (
    <img
      src="/logo.svg"
      alt="CityChain"
      style={{ width: size, height: size, objectFit: 'contain' }}
      className={className}
    />
  );
}
