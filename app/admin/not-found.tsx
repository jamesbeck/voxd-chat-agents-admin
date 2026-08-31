import Link from "next/link";
import BreadcrumbSetter from "@/components/admin/BreadcrumbSetter";
import Container from "@/components/adminui/Container";
import H1 from "@/components/adminui/H1";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <Container>
      <BreadcrumbSetter
        breadcrumbs={[{ label: "Admin" }, { label: "Not Found" }]}
      />
      <H1>Page Not Found</H1>
      <p>The admin page you requested could not be found.</p>
      <div>
        <Button asChild>
          <Link href="/">Back to Admin</Link>
        </Button>
      </div>
    </Container>
  );
}
