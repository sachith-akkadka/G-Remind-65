// hooks/use-toast.ts
import Toast from "react-native-toast-message";

type ToastOptions = {
  title: string;
  description?: string;
  variant?: "success" | "destructive" | "info";
  duration?: number;
};

export function useToast() {
  const toast = ({ title, description, variant, duration = 3000 }: ToastOptions) => {
    Toast.show({
      type:
        variant === "destructive" ? "error" :
        variant === "success" ? "success" : "info",
      text1: title,
      text2: description,
      visibilityTime: duration,
      position: "top",
    });
  };

  return { toast };
}
