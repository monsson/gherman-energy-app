import logoUrl from "~/assets/gherman-logo.png";

type Props = { size?: number; tone?: "dark" | "light" };

export function Logo({ size = 56 }: Props) {
  return (
    <img
      src={logoUrl}
      alt="Gherman Energy"
      style={{ height: size, width: "auto", display: "block" }}
    />
  );
}

export function LogoWordmark({ tone: _tone }: { tone?: "dark" | "light" } = {}) {
  return <Logo size={36} />;
}
