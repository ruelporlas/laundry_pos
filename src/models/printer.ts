export type PrinterConnectionType = "bluetooth_classic" | "usb";

export type PrinterConfig = {
  id: 1;

  /**
   * User-friendly printer name.
   *
   * Example:
   * PhoneBox PB-58
   */
  name: string;

  /**
   * Bluetooth device identifier/address.
   *
   * This will remain null until a printer
   * is actually paired/configured.
   */
  deviceId: string | null;

  /**
   * Connection method supported by the
   * configured printer.
   */
  connectionType: PrinterConnectionType;

  /**
   * Receipt paper width used by the printer.
   */
  paperWidth: "58mm" | "80mm";

  /**
   * Whether this printer is currently
   * configured for receipt printing.
   */
  isEnabled: boolean;

  createdAt: string;
  updatedAt: string;
};
