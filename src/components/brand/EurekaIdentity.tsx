type BrandMarkProps = {
  className?: string;
  label?: string;
};

export function EurekaMark({ className = "", label }: BrandMarkProps) {
  const classes = ["eureka-mark", className].filter(Boolean).join(" ");
  return (
    <span className={classes} aria-label={label} aria-hidden={label ? undefined : true}>
      <span>ε</span>
    </span>
  );
}

export function AlexandriaLighthouseMark({ className = "" }: { className?: string }) {
  const classes = ["alexandria-lighthouse", className].filter(Boolean).join(" ");
  return (
    <svg className={classes} viewBox="0 0 64 64" role="img" aria-label="Alexandrian lighthouse motif">
      <path className="alexandria-lighthouse__beam" d="M18 16 4 10M46 16l14-6M16 23 2-7h28l2 7" />
      <path className="alexandria-lighthouse__lantern" d="M24 16V9h16v7M28 9V5h8v4" />
      <circle className="alexandria-lighthouse__flame" cx="32" cy="4" r="2.25" />
      <path className="alexandria-lighthouse__tower" d="M23 23h18l-3 30H26L23 23Z" />
      <path className="alexandria-lighthouse__tower" d="M27 35h10M26 45h12M21 53h22" />
      <path className="alexandria-lighthouse__water" d="M8 58c4-3 8-3 12 0s8 3 12 0 8-3 12 0 8 3 12 0" />
    </svg>
  );
}
