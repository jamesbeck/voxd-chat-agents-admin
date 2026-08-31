import Link from "next/link";
import H1 from "@/components/adminui/H1";
import UsersTable from "./usersTable";
import BreadcrumbSetter from "@/components/admin/BreadcrumbSetter";
import Container from "@/components/adminui/Container";
import { Button } from "@/components/ui/button";

export default async function Page() {
  return (
    <Container>
      <BreadcrumbSetter
        breadcrumbs={[{ label: "Admin", href: "/" }, { label: "Users" }]}
      />
      <H1>Chat Users</H1>
      <p>These are users that have engaged with any of your agents.</p>

      <div className="flex justify-end">
        <Button asChild>
          <Link href="/chatUsers/new">New User</Link>
        </Button>
      </div>

      <UsersTable />
    </Container>
  );
}
