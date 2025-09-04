import { useCallback } from 'react';

interface UseConfirmDialogProps {
  text: string;
  onConfirm?: () => void;
  onClose?: () => void;
}

export const useConfirmDialog = ({ text, onConfirm, onClose }: UseConfirmDialogProps) => {
  const confirm = useCallback(() => {
    if (window.confirm(text)) {
      onConfirm?.();
    } else {
      onClose?.();
    }
  }, [onConfirm, onClose]);

  return confirm;
};
