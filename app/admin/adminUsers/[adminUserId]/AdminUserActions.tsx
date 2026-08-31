"use client";

import { AdminUser } from "@/types/types";
import saDeleteAdminUser from "@/actions/saDeleteAdminUser";
import { toast } from "sonner";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2Icon } from "lucide-react";
import RecordActions from "@/components/admin/RecordActions";

export default function UserActions({
  user,
  canWriteUsers,
}: {
  user: AdminUser;
  canWriteUsers: boolean;
}) {
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  const router = useRouter();

  const deleteUser = async () => {
    setIsDeletingUser(true);
    const saResponse = await saDeleteAdminUser({ userId: user.id });

    if (!saResponse.success) {
      toast.error(
        `Error Deleting User: ${
          saResponse.error || "There was an error deleting the user"
        }`,
      );
      setIsDeletingUser(false);
      return;
    }
    // If successful
    toast.success(`Successfully deleted ${user.name}`);
    setIsDeletingUser(false);
    router.push("/adminUsers");
  };

  if (!canWriteUsers) return null;

  return (
    <RecordActions
      buttons={[
        {
          label: `Delete ${user.name}`,
          icon: <Trash2Icon />,
          variant: "destructive",
          loading: isDeletingUser,
          confirm: {
            title: `Delete ${user.name}`,
            description: "This action cannot be undone.",
            actionText: "Delete",
            destructive: true,
          },
          onClick: deleteUser,
        },
      ]}
    />
  );
}
