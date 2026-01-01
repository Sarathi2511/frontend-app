export interface MenuOption {
  key: string;
  label: string;
  action: () => void;
  disabled?: boolean;
  destructive?: boolean;
}

