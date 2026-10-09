import type { PrinterConfig, PrinterConnectionType } from "@/models/printer";

export type PrinterConnectionState =
  | "disconnected"
  | "connecting"
  | "connected";

export type PrinterDevice = {
  id: string;
  name: string;
};

export type PrinterServiceErrorCode =
  | "NOT_CONFIGURED"
  | "NOT_CONNECTED"
  | "CONNECTION_FAILED"
  | "PRINT_FAILED"
  | "UNSUPPORTED_CONNECTION_TYPE";

export class PrinterServiceError extends Error {
  readonly code: PrinterServiceErrorCode;

  constructor(code: PrinterServiceErrorCode, message: string) {
    super(message);
    this.name = "PrinterServiceError";
    this.code = code;
  }
}

export interface PrinterService {
  getConnectionState(): PrinterConnectionState;

  getConnectedDevice(): PrinterDevice | null;

  connect(device: PrinterDevice): Promise<void>;

  disconnect(): Promise<void>;

  print(data: Uint8Array): Promise<void>;
}

/**
 * Converts a configured connection type into
 * the transport type expected by the printer
 * service.
 *
 * This currently exists only to keep the
 * configuration model separate from the
 * eventual Bluetooth/USB implementation.
 */
export function getPrinterConnectionType(
  config: PrinterConfig,
): PrinterConnectionType {
  return config.connectionType;
}

/**
 * Bluetooth/USB printer implementation will
 * be added once the actual printer hardware
 * and transport requirements are confirmed.
 */
class UnavailablePrinterService implements PrinterService {
  private connectionState: PrinterConnectionState = "disconnected";

  private connectedDevice: PrinterDevice | null = null;

  getConnectionState(): PrinterConnectionState {
    return this.connectionState;
  }

  getConnectedDevice(): PrinterDevice | null {
    return this.connectedDevice;
  }

  async connect(_device: PrinterDevice): Promise<void> {
    throw new PrinterServiceError(
      "CONNECTION_FAILED",
      "Printer connection is not configured yet.",
    );
  }

  async disconnect(): Promise<void> {
    this.connectionState = "disconnected";
    this.connectedDevice = null;
  }

  async print(_data: Uint8Array): Promise<void> {
    if (this.connectionState !== "connected") {
      throw new PrinterServiceError(
        "NOT_CONNECTED",
        "No printer is currently connected.",
      );
    }

    throw new PrinterServiceError(
      "PRINT_FAILED",
      "Printer printing is not configured yet.",
    );
  }
}

export const printerService: PrinterService = new UnavailablePrinterService();
