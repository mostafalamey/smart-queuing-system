import { useToast } from "@/contexts/ToastContext";

export const useAppToast = () => {
  const { addToast } = useToast();

  const showSuccess = (
    title: string,
    message?: string,
    action?: { label: string; onClick: () => void }
  ) => {
    addToast({
      type: "success",
      title,
      message,
      action,
      duration: 5000,
    });
  };

  const showError = (
    title: string,
    message?: string,
    action?: { label: string; onClick: () => void }
  ) => {
    addToast({
      type: "error",
      title,
      message,
      action,
      duration: 7000, // Longer duration for errors
    });
  };

  const showWarning = (
    title: string,
    message?: string,
    action?: { label: string; onClick: () => void }
  ) => {
    addToast({
      type: "warning",
      title,
      message,
      action,
      duration: action ? 0 : 6000, // Persistent if there's an action button
    });
  };

  const showInfo = (
    title: string,
    message?: string,
    action?: { label: string; onClick: () => void }
  ) => {
    addToast({
      type: "info",
      title,
      message,
      action,
      duration: 5000,
    });
  };

  const showPersistent = (
    type: "success" | "error" | "warning" | "info",
    title: string,
    message?: string,
    action?: { label: string; onClick: () => void }
  ) => {
    addToast({
      type,
      title,
      message,
      action,
      duration: 0, // Won't auto-dismiss
    });
  };

  const showConfirmation = (
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void
  ) => {
    addToast({
      type: "warning",
      title,
      message,
      action: {
        label: "Delete",
        onClick: onConfirm,
      },
      duration: 0, // Won't auto-dismiss until user acts
    });
  };

  return {
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showPersistent,
    showConfirmation,
  };
};
