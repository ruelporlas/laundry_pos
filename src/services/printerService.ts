import { PermissionsAndroid, Platform } from "react-native";
import RNBluetoothClassic, {
  type BluetoothDevice,
} from "react-native-bluetooth-classic";

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
  | "UNSUPPORTED_CONNECTION_TYPE"
  | "BLUETOOTH_UNAVAILABLE"
  | "PERMISSION_DENIED"
  | "DEVICE_NOT_FOUND";

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
  getPairedDevices(): Promise<PrinterDevice[]>;
  connect(device: PrinterDevice): Promise<void>;
  disconnect(): Promise<void>;
  print(data: Uint8Array): Promise<void>;
}

export function getPrinterConnectionType(
  config: PrinterConfig,
): PrinterConnectionType {
  return config.connectionType;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function bytesToHex(data: Uint8Array): string {
  return Array.from(data)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function requestBluetoothPermission(): Promise<void> {
  if (Platform.OS !== "android") {
    throw new PrinterServiceError(
      "UNSUPPORTED_CONNECTION_TYPE",
      "Bluetooth receipt printing is currently supported on Android only.",
    );
  }

  // Android 12 (API 31) and later require the runtime
  // BLUETOOTH_CONNECT permission to access paired devices.
  if (Number(Platform.Version) < 31) {
    return;
  }

  const permission = PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT;

  const result = await PermissionsAndroid.request(permission, {
    title: "Bluetooth permission",
    message:
      "Laundry POS needs Bluetooth access to connect to your paired receipt printer.",
    buttonPositive: "Allow",
    buttonNegative: "Deny",
  });

  if (result !== PermissionsAndroid.RESULTS.GRANTED) {
    throw new PrinterServiceError(
      "PERMISSION_DENIED",
      "Bluetooth permission was not granted. Allow Bluetooth access in Android settings to use the receipt printer.",
    );
  }
}

class BluetoothPrinterService implements PrinterService {
  private connectionState: PrinterConnectionState = "disconnected";

  private connectedDevice: PrinterDevice | null = null;

  private nativeDevice: BluetoothDevice | null = null;

  getConnectionState(): PrinterConnectionState {
    return this.connectionState;
  }

  getConnectedDevice(): PrinterDevice | null {
    return this.connectedDevice;
  }

  async getPairedDevices(): Promise<PrinterDevice[]> {
    await requestBluetoothPermission();

    try {
      const available = await RNBluetoothClassic.isBluetoothAvailable();

      if (!available) {
        throw new PrinterServiceError(
          "BLUETOOTH_UNAVAILABLE",
          "This device does not support Bluetooth.",
        );
      }

      const enabled = await RNBluetoothClassic.isBluetoothEnabled();

      if (!enabled) {
        throw new PrinterServiceError(
          "BLUETOOTH_UNAVAILABLE",
          "Bluetooth is turned off. Turn it on in Android settings and try again.",
        );
      }

      const devices = await RNBluetoothClassic.getBondedDevices();

      return devices
        .filter((device) => Boolean(device.address))
        .map((device) => ({
          id: device.address,
          name: device.name?.trim() || "Unnamed Bluetooth device",
        }));
    } catch (error) {
      if (error instanceof PrinterServiceError) {
        throw error;
      }

      throw new PrinterServiceError(
        "CONNECTION_FAILED",
        `Could not load paired Bluetooth devices: ${getErrorMessage(error)}`,
      );
    }
  }

  async connect(device: PrinterDevice): Promise<void> {
    if (Platform.OS !== "android") {
      throw new PrinterServiceError(
        "UNSUPPORTED_CONNECTION_TYPE",
        "Bluetooth receipt printing is currently supported on Android only.",
      );
    }

    if (!device.id.trim()) {
      throw new PrinterServiceError(
        "DEVICE_NOT_FOUND",
        "The selected printer has no Bluetooth address.",
      );
    }

    this.connectionState = "connecting";

    try {
      await requestBluetoothPermission();

      const pairedDevices = await RNBluetoothClassic.getBondedDevices();
      const nativeDevice = pairedDevices.find(
        (pairedDevice) => pairedDevice.address === device.id,
      );

      if (!nativeDevice) {
        throw new PrinterServiceError(
          "DEVICE_NOT_FOUND",
          "The selected printer is no longer paired. Pair it in Android Bluetooth settings, then try again.",
        );
      }

      if (this.nativeDevice) {
        try {
          await this.nativeDevice.disconnect();
        } catch {
          // Continue and attempt the requested connection.
        }
      }

      const alreadyConnected = await nativeDevice.isConnected();

      if (!alreadyConnected) {
        const connected = await nativeDevice.connect({
          CONNECTOR_TYPE: "rfcomm",
          CONNECTION_TYPE: "delimited",
          DELIMITER: "",
          DEVICE_CHARSET: "ascii",
        });

        if (!connected) {
          throw new Error(
            "The Bluetooth device did not accept the connection.",
          );
        }
      }

      this.nativeDevice = nativeDevice;
      this.connectedDevice = {
        id: nativeDevice.address,
        name: nativeDevice.name?.trim() || device.name,
      };
      this.connectionState = "connected";
    } catch (error) {
      this.nativeDevice = null;
      this.connectedDevice = null;
      this.connectionState = "disconnected";

      if (error instanceof PrinterServiceError) {
        throw error;
      }

      throw new PrinterServiceError(
        "CONNECTION_FAILED",
        `Could not connect to ${device.name}: ${getErrorMessage(error)}`,
      );
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.nativeDevice) {
        await this.nativeDevice.disconnect();
      }
    } catch (error) {
      throw new PrinterServiceError(
        "CONNECTION_FAILED",
        `Could not disconnect the printer: ${getErrorMessage(error)}`,
      );
    } finally {
      this.nativeDevice = null;
      this.connectedDevice = null;
      this.connectionState = "disconnected";
    }
  }

  async print(data: Uint8Array): Promise<void> {
    if (
      this.connectionState !== "connected" ||
      !this.nativeDevice ||
      !this.connectedDevice
    ) {
      throw new PrinterServiceError(
        "NOT_CONNECTED",
        "No printer is connected. Connect a paired printer before printing.",
      );
    }

    if (data.length === 0) {
      throw new PrinterServiceError(
        "PRINT_FAILED",
        "The receipt contains no printable data.",
      );
    }

    try {
      const connected = await this.nativeDevice.isConnected();

      if (!connected) {
        this.nativeDevice = null;
        this.connectedDevice = null;
        this.connectionState = "disconnected";

        throw new PrinterServiceError(
          "NOT_CONNECTED",
          "The printer connection was lost. Reconnect and try again.",
        );
      }

      // Send the existing ESC/POS byte stream as hexadecimal.
      // This preserves control bytes such as initialize, alignment,
      // line feeds and other printer commands.
      const hexData = bytesToHex(data);
      const written = await this.nativeDevice.write(hexData, "hex");

      if (!written) {
        throw new Error("The printer did not confirm the write operation.");
      }
    } catch (error) {
      if (error instanceof PrinterServiceError) {
        throw error;
      }

      throw new PrinterServiceError(
        "PRINT_FAILED",
        `Could not send the receipt to the printer: ${getErrorMessage(error)}`,
      );
    }
  }
}

export const printerService: PrinterService = new BluetoothPrinterService();
