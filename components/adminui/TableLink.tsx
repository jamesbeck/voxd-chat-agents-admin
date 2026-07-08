import Link from "next/link";
import { ExternalLink } from "lucide-react";

const TableLink = ({
  href,
  children,
  showIcon = true,
}: {
  href: string;
  children: React.ReactNode;
  showIcon?: boolean;
}) => {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 hover:underline"
    >
      {showIcon ? (
        <ExternalLink
          className="h-[1em] w-[1em] shrink-0"
          style={{ color: "var(--color-primary)" }}
        />
      ) : null}
      {children}
    </Link>
  );
};

export default TableLink;
