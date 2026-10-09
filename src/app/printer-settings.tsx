import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { AppButton } from "@/components/ui/AppButton";
import { AppCard } from "@/components/ui/AppCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { PageHero } from "@/components/ui/PageHero";
import { colors } from "@/constants/colors";
import { PAGE_PADDING } from "@/constants/layout";
import { spacing } from "@/constants/spacing";
import { theme } from "@/constants/theme";
import { typography } from "@/constants/typography";
import type { PrinterDevice } from "@/services/printerService";
import { printerService } from "@/services/printerService";

const MAX_CONTENT_WIDTH = 720;

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "An unexpected Bluetooth error occurred.";
}

function createTestReceipt(): Uint8Array {
  const textBytes = (value: string) =>
    Array.from(value, (character) => character.charCodeAt(0));

  return new Uint8Array([
    0x1b,
    0x40, // Initialize printer
    0x1b,
    0x61,
    0x01, // Center alignment
    0x1b,
    0x45,
    0x01, // Bold on
    ...textBytes("LAUNDRY POS"),
    0x0a,
    0x1b,
    0x45,
    0x00, // Bold off
    ...textBytes("------------------------------"),
    0x0a,
    ...textBytes("BLUETOOTH TEST"),
    0x0a,
    ...textBytes("XP-58-H"),
    0x0a,
    ...textBytes("Connection test successful"),
    0x0a,
    0x0a,
    0x0a,
  ]);
}

export default function PrinterSettingsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ jobOrderId?: string }>();
  const jobOrderId = params.jobOrderId;

  const [devices, setDevices] = useState<PrinterDevice[]>([]);
  const [connectedDevice, setConnectedDevice] = useState<PrinterDevice | null>(
    printerService.getConnectedDevice(),
  );
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const [printingTest, setPrintingTest] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadDevices = useCallback(async () => {
    try {
      setLoadingDevices(true);
      setError("");
      setNotice("");

      const pairedDevices = await printerService.getPairedDevices();

      setDevices(pairedDevices);
      setConnectedDevice(printerService.getConnectedDevice());

      if (pairedDevices.length === 0) {
        setNotice(
          "No paired Bluetooth devices were found. Pair the XP-58-H in Android Bluetooth settings, then refresh this list.",
        );
      }
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoadingDevices(false);
    }
  }, []);

  useEffect(() => {
    void loadDevices();
  }, [loadDevices]);

  async function handleConnect(device: PrinterDevice) {
    try {
      setConnectingId(device.id);
      setError("");
      setNotice("");

      await printerService.connect(device);

      setConnectedDevice(printerService.getConnectedDevice());
      setNotice(`Connected to ${device.name}.`);
    } catch (connectError) {
      setConnectedDevice(printerService.getConnectedDevice());
      setError(getErrorMessage(connectError));
    } finally {
      setConnectingId(null);
    }
  }

  async function handleDisconnect() {
    try {
      setDisconnecting(true);
      setError("");
      setNotice("");

      await printerService.disconnect();

      setConnectedDevice(null);
      setNotice("Printer disconnected.");
    } catch (disconnectError) {
      setError(getErrorMessage(disconnectError));
      setConnectedDevice(printerService.getConnectedDevice());
    } finally {
      setDisconnecting(false);
    }
  }

  async function handleTestPrint() {
    try {
      setPrintingTest(true);
      setError("");
      setNotice("");

      await printerService.print(createTestReceipt());

      setNotice(
        "Test receipt data was sent to the printer. Check whether paper printed successfully.",
      );
    } catch (printError) {
      setError(getErrorMessage(printError));
      setConnectedDevice(printerService.getConnectedDevice());
    } finally {
      setPrintingTest(false);
    }
  }

  function handleReturnToJobOrder() {
    if (!jobOrderId) {
      return;
    }

    router.replace({
      pathname: "/job-order-created",
      params: { id: jobOrderId },
    });
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <PageHero
          icon="print-outline"
          title="Printer Setup"
          subtitle="Connect your Bluetooth thermal receipt printer"
        />

        <View style={styles.contentInner}>
          <AppCard padding={spacing.lg} style={styles.statusCard}>
            <View style={styles.statusRow}>
              <View
                style={[
                  styles.statusIcon,
                  connectedDevice
                    ? styles.statusIconConnected
                    : styles.statusIconDisconnected,
                ]}
              >
                <Ionicons
                  name={connectedDevice ? "bluetooth" : "bluetooth-outline"}
                  size={25}
                  color={
                    connectedDevice ? colors.success : colors.textSecondary
                  }
                />
              </View>

              <View style={styles.statusText}>
                <Text style={styles.statusTitle}>
                  {connectedDevice
                    ? "Printer connected"
                    : "No printer connected"}
                </Text>

                <Text style={styles.statusSubtitle}>
                  {connectedDevice
                    ? `${connectedDevice.name}\n${connectedDevice.id}`
                    : "Select a paired printer below to establish a connection."}
                </Text>
              </View>
            </View>

            {connectedDevice ? (
              <View style={styles.statusActions}>
                <AppButton
                  title="Print Test Receipt"
                  icon="print-outline"
                  fullWidth
                  loading={printingTest}
                  disabled={disconnecting || connectingId !== null}
                  onPress={handleTestPrint}
                />

                <AppButton
                  title="Disconnect"
                  icon="bluetooth-outline"
                  variant="secondary"
                  fullWidth
                  loading={disconnecting}
                  disabled={printingTest || connectingId !== null}
                  onPress={handleDisconnect}
                />
              </View>
            ) : null}
          </AppCard>

          {notice ? (
            <View style={styles.noticeBox}>
              <Ionicons
                name="information-circle-outline"
                size={20}
                color={colors.primary}
              />
              <Text style={styles.noticeText}>{notice}</Text>
            </View>
          ) : null}

          {error ? (
            <View style={styles.errorBox}>
              <ErrorState title="Printer operation failed" message={error} />
            </View>
          ) : null}

          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeading}>
              <Text style={styles.sectionTitle}>Paired Bluetooth Devices</Text>
              <Text style={styles.sectionSubtitle}>
                Select the XP-58-H from your phone's paired devices.
              </Text>
            </View>

            <AppButton
              title="Refresh"
              icon="refresh-outline"
              variant="secondary"
              loading={loadingDevices}
              disabled={connectingId !== null || disconnecting || printingTest}
              onPress={loadDevices}
            />
          </View>

          {loadingDevices && devices.length === 0 ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>
                Loading paired Bluetooth devices...
              </Text>
            </View>
          ) : devices.length === 0 ? (
            <AppCard padding={spacing.sm}>
              <EmptyState
                icon="bluetooth-outline"
                title="No paired devices"
                message="Pair your printer in Android Bluetooth settings, then tap Refresh."
              />
            </AppCard>
          ) : (
            <View style={styles.deviceList}>
              {devices.map((device) => {
                const isConnected = connectedDevice?.id === device.id;
                const isConnecting = connectingId === device.id;

                return (
                  <AppCard
                    key={device.id}
                    padding={spacing.md}
                    style={[
                      styles.deviceCard,
                      isConnected ? styles.deviceCardConnected : null,
                    ]}
                  >
                    <View style={styles.deviceRow}>
                      <View style={styles.deviceIcon}>
                        <Ionicons
                          name="print-outline"
                          size={24}
                          color={colors.primary}
                        />
                      </View>

                      <View style={styles.deviceInfo}>
                        <Text style={styles.deviceName}>
                          {device.name || "Unnamed Bluetooth device"}
                        </Text>

                        <Text style={styles.deviceAddress}>{device.id}</Text>

                        {isConnected ? (
                          <Text style={styles.connectedLabel}>Connected</Text>
                        ) : null}
                      </View>
                    </View>

                    <AppButton
                      title={
                        isConnected
                          ? "Currently Connected"
                          : isConnecting
                            ? "Connecting..."
                            : "Connect"
                      }
                      icon={
                        isConnected
                          ? "checkmark-circle-outline"
                          : "bluetooth-outline"
                      }
                      fullWidth
                      loading={isConnecting}
                      disabled={
                        isConnected ||
                        connectingId !== null ||
                        disconnecting ||
                        printingTest
                      }
                      onPress={() => handleConnect(device)}
                    />
                  </AppCard>
                );
              })}
            </View>
          )}

          {jobOrderId && connectedDevice ? (
            <View style={styles.returnButton}>
              <AppButton
                title="Return to Job Order"
                icon="arrow-back-outline"
                fullWidth
                onPress={handleReturnToJobOrder}
              />
            </View>
          ) : null}

          <Text style={styles.footerHint}>
            Keep the printer powered on and paired with this phone. If it does
            not appear here, check Android Bluetooth settings and refresh.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    paddingBottom: spacing["4xl"],
  },

  contentInner: {
    width: "100%",
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: "center",
    paddingHorizontal: PAGE_PADDING,
  },

  statusCard: {
    marginTop: spacing.lg,
  },

  statusRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  statusIcon: {
    width: 52,
    height: 52,
    borderRadius: theme.radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },

  statusIconConnected: {
    backgroundColor: colors.successLight,
  },

  statusIconDisconnected: {
    backgroundColor: colors.surfaceSoft,
  },

  statusText: {
    flex: 1,
    marginLeft: spacing.md,
  },

  statusTitle: {
    ...typography.bodyMedium,
    color: colors.text,
  },

  statusSubtitle: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },

  statusActions: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },

  noticeBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: colors.primaryLight,
  },

  noticeText: {
    ...typography.small,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 20,
  },

  errorBox: {
    marginTop: spacing.md,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginTop: spacing["2xl"],
    marginBottom: spacing.md,
  },

  sectionHeading: {
    flex: 1,
  },

  sectionTitle: {
    ...typography.h3,
    color: colors.text,
  },

  sectionSubtitle: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },

  loadingBox: {
    alignItems: "center",
    padding: spacing["2xl"],
    gap: spacing.md,
  },

  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
  },

  deviceList: {
    gap: spacing.md,
  },

  deviceCard: {
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },

  deviceCardConnected: {
    borderColor: colors.success,
  },

  deviceRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  deviceIcon: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },

  deviceInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },

  deviceName: {
    ...typography.bodyMedium,
    color: colors.text,
  },

  deviceAddress: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: 3,
  },

  connectedLabel: {
    ...typography.small,
    color: colors.success,
    marginTop: spacing.xs,
  },

  returnButton: {
    marginTop: spacing.xl,
  },

  footerHint: {
    ...typography.small,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.xl,
    lineHeight: 19,
  },
});
