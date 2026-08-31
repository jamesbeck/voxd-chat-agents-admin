"use client";

import { ChatUser } from "@/types/types";
import saDeleteUser from "@/actions/saDeleteUser";
import saDeleteSessionsByUser from "@/actions/saDeleteSessionsByUser";
import saClearUserData from "@/actions/saClearUserData";
import { toast } from "sonner";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2Icon, Wrench, XCircleIcon } from "lucide-react";
import RecordActions from "@/components/admin/RecordActions";
import RunCustomFunctionDialog from "@/components/admin/RunCustomFunctionDialog";
import useAvailableCustomFunctions, {
  getAvailableCustomFunctionLabel,
} from "@/hooks/useAvailableCustomFunctions";

export default function UserActions({ user }: { user: ChatUser }) {
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [isDeletingSessions, setIsDeletingSessions] = useState(false);
  const [isClearingData, setIsClearingData] = useState(false);
  const [runDialogOpen, setRunDialogOpen] = useState(false);
  const [selectedFunctionId, setSelectedFunctionId] = useState<string>();

  const { functions: customFunctions, isLoading: isLoadingCustomFunctions } =
    useAvailableCustomFunctions({
      agentId: user.agentId,
      allowedTargetScopes: ["agent", "user"],
    });

  const router = useRouter();

  const deleteUser = async () => {
    setIsDeletingUser(true);
    const saResponse = await saDeleteUser({ userId: user.id });

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
    router.push("/chatUsers");
  };

  const deleteUserSessions = async () => {
    setIsDeletingSessions(true);
    const saResponse = await saDeleteSessionsByUser({ userId: user.id });

    if (!saResponse.success) {
      toast.error(
        `Error Deleting User's Sessions: ${
          saResponse.error || "There was an error deleting the user's sessions"
        }`,
      );
      setIsDeletingSessions(false);
      return;
    }
    // If successful
    toast.success(`Successfully deleted sessions for ${user.name}`);
    setIsDeletingSessions(false);
    router.refresh();
  };

  const clearUserData = async () => {
    setIsClearingData(true);
    const saResponse = await saClearUserData({ userId: user.id });

    if (!saResponse.success) {
      toast.error(
        `Error Clearing User Data: ${
          saResponse.error || "There was an error clearing the user data"
        }`,
      );
      setIsClearingData(false);
      return;
    }
    // If successful
    toast.success(`Successfully cleared data for ${user.name}`);
    setIsClearingData(false);
    router.refresh();
  };

  return (
    <>
      <RecordActions
        dropdown={{
          loading: isDeletingUser || isDeletingSessions || isClearingData,
          groups: [
            {
              items: [
                ...(isLoadingCustomFunctions
                  ? [
                      {
                        label: "Loading custom functions...",
                        icon: <Wrench />,
                        loading: true,
                        disabled: true,
                      },
                    ]
                  : customFunctions.length > 0
                    ? customFunctions.map((customFunction) => ({
                        label:
                          customFunction.targetScopes.length > 1
                            ? `${getAvailableCustomFunctionLabel(customFunction)} (${customFunction.targetScopes.join(", ")})`
                            : getAvailableCustomFunctionLabel(customFunction),
                        icon: <Wrench />,
                        onSelect: () => {
                          setSelectedFunctionId(customFunction.id);
                          setRunDialogOpen(true);
                        },
                      }))
                    : [
                        {
                          label: "No custom functions available",
                          icon: <Wrench />,
                          disabled: true,
                        },
                      ]),
              ],
            },
            {
              items: [
                {
                  label: "Clear User Data",
                  icon: <XCircleIcon />,
                  danger: true,
                  loading: isClearingData,
                  confirm: {
                    title: `Clear ${user.name}'s Data`,
                    description:
                      "This action cannot be undone. All stored data for this user will be cleared and reset to an empty object.",
                    actionText: "Clear Data",
                    destructive: true,
                    onAction: clearUserData,
                  },
                },
                {
                  label: "Delete Sessions",
                  icon: <Trash2Icon />,
                  danger: true,
                  loading: isDeletingSessions,
                  confirm: {
                    title: `Delete ${user.name}'s Sessions`,
                    description:
                      "This action cannot be undone. All sessions for this user will be permanently deleted.",
                    actionText: "Delete Sessions",
                    destructive: true,
                    onAction: deleteUserSessions,
                  },
                },
              ],
            },
            {
              items: [
                {
                  label: "Delete User",
                  icon: <Trash2Icon />,
                  danger: true,
                  loading: isDeletingUser,
                  confirm: {
                    title: `Delete ${user.name}`,
                    description:
                      "This action cannot be undone. The user and all their data will be permanently deleted.",
                    actionText: "Delete",
                    destructive: true,
                    onAction: deleteUser,
                  },
                },
              ],
            },
          ],
        }}
      />

      <RunCustomFunctionDialog
        key={selectedFunctionId || "user-custom-function"}
        open={runDialogOpen}
        onOpenChange={setRunDialogOpen}
        agentId={user.agentId}
        functions={customFunctions}
        initialFunctionId={selectedFunctionId}
        lockFunctionSelection
        chatUserId={user.id}
        allowedTargetScopes={["agent", "user"]}
        description="Select a custom function to run for this user or for the owning agent."
      />
    </>
  );
}
