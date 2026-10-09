import { useAuth } from "@/context/AuthContext";
import { doAction } from "@/hooks/actions";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { AppButton } from "@/components/ui/AppButton";
import { AppCard } from "@/components/ui/AppCard";
import { AppInput } from "@/components/ui/AppInput";
import { LoadingState } from "@/components/ui/LoadingState";
import { PageHero } from "@/components/ui/PageHero";
import { colors } from "@/constants/colors";
import { PAGE_PADDING } from "@/constants/layout";
import { spacing } from "@/constants/spacing";
import { theme } from "@/constants/theme";
import { typography } from "@/constants/typography";
import type { Bundle } from "@/models/bundle";
import type { Customer } from "@/models/customer";
import type {
  DiscountType,
  JobOrderDraft,
  JobOrderDraftItem,
  PaymentMethod,
} from "@/models/jobOrder";
import type { Product } from "@/models/product";
import type { Service } from "@/models/service";
import { getBundles } from "@/repositories/bundleRepository";
import { getCustomers } from "@/repositories/customerRepository";
import {
  calculateJobOrderTotals,
  createJobOrder,
} from "@/repositories/jobOrderRepository";
import { getProducts } from "@/repositories/productRepository";
import { getServices } from "@/repositories/serviceRepository";

function formatCurrency(amount: number): string {
  return `₱${amount.toFixed(2)}`;
}

type CatalogType = "service" | "product" | "bundle";

type PaymentTiming = "pay_now" | "pay_later";

type CatalogItem = {
  id: number;
  name: string;
  description: string;
  price: number;
  type: CatalogType;
};

const GRID_GAP = spacing.lg;
const MAX_CONTENT_WIDTH = 1200;
const ADD_FEEDBACK_DURATION = 900;

export default function NewJobOrderScreen() {
  const router = useRouter();

  const { width } = useWindowDimensions();
  const { user } = useAuth();

  const isTablet = width >= 768;

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [bundles, setBundles] = useState<Bundle[]>([]);

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );

  const [items, setItems] = useState<JobOrderDraftItem[]>([]);

  const [removedItems, setRemovedItems] = useState<JobOrderDraftItem[]>([]);

  const [catalogType, setCatalogType] = useState<CatalogType>("service");

  const [catalogSearch, setCatalogSearch] = useState("");

  const [customerSearch, setCustomerSearch] = useState("");

  const [showCustomerPicker, setShowCustomerPicker] = useState(false);

  const [discountType, setDiscountType] = useState<DiscountType | null>(null);

  const [discountValue, setDiscountValue] = useState(0);

  const [showDiscount, setShowDiscount] = useState(false);

  const [addedItemKey, setAddedItemKey] = useState<string | null>(null);

  const [paymentTiming, setPaymentTiming] =
    useState<PaymentTiming>("pay_later");

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");

  const [cashReceived, setCashReceived] = useState("");

  const [gcashAmount, setGcashAmount] = useState("");

  const [gcashReference, setGcashReference] = useState("");

  const [otherAmount, setOtherAmount] = useState("");

  const [otherPaymentNote, setOtherPaymentNote] = useState("");

  const [saving, setSaving] = useState(false);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [customerData, productData, serviceData, bundleData] =
        await Promise.all([
          getCustomers(),
          getProducts(),
          getServices(),
          getBundles(),
        ]);

      setCustomers(customerData.filter((customer) => customer.isActive));
      setProducts(productData.filter((product) => product.isActive));
      setServices(serviceData.filter((service) => service.isActive));
      setBundles(bundleData.filter((bundle) => bundle.isActive));
    } catch (err) {
      console.error("Failed to load Job Order data:", err);

      setError(
        err instanceof Error ? err.message : "Unable to load Job Order data.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const numColumns = width >= 1200 ? 4 : width >= 768 ? 3 : 2;

  const contentWidth = Math.min(width, MAX_CONTENT_WIDTH);

  const availableWidth = contentWidth - PAGE_PADDING * 2;

  const catalogCardWidth =
    (availableWidth - GRID_GAP * (numColumns - 1)) / numColumns;

  const currentCatalogItems = useMemo<CatalogItem[]>(() => {
    if (catalogType === "service") {
      return services.map((service) => ({
        id: service.id,
        name: service.name,
        description: service.description,
        price: service.price,
        type: "service",
      }));
    }

    if (catalogType === "product") {
      return products.map((product) => ({
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        type: "product",
      }));
    }

    return bundles.map((bundle) => ({
      id: bundle.id,
      name: bundle.name,
      description: bundle.description,
      price: bundle.price,
      type: "bundle",
    }));
  }, [catalogType, services, products, bundles]);

  const filteredCatalogItems = useMemo(() => {
    const search = catalogSearch.trim().toLowerCase();

    if (!search) {
      return currentCatalogItems;
    }

    return currentCatalogItems.filter(
      (item) =>
        item.name.toLowerCase().includes(search) ||
        item.description.toLowerCase().includes(search),
    );
  }, [catalogSearch, currentCatalogItems]);

  const filteredCustomers = useMemo(() => {
    const search = customerSearch.trim().toLowerCase();

    if (!search) {
      return customers;
    }

    return customers.filter(
      (customer) =>
        customer.name.toLowerCase().includes(search) ||
        customer.phone.toLowerCase().includes(search),
    );
  }, [customerSearch, customers]);

  const totals = useMemo(
    () => calculateJobOrderTotals(items, discountType, discountValue),
    [items, discountType, discountValue],
  );

  const cashReceivedAmount = parseAmount(cashReceived);
  const gcashPaidAmount = parseAmount(gcashAmount);
  const otherPaidAmount = parseAmount(otherAmount);

  const amountPaid =
    paymentTiming === "pay_later"
      ? 0
      : paymentMethod === "cash"
        ? Math.min(Math.max(cashReceivedAmount, 0), totals.total)
        : paymentMethod === "gcash"
          ? Math.min(Math.max(gcashPaidAmount, 0), totals.total)
          : Math.min(Math.max(otherPaidAmount, 0), totals.total);

  const balance = Math.max(totals.total - amountPaid, 0);

  const changeAmount =
    paymentTiming === "pay_now" && paymentMethod === "cash"
      ? Math.max(cashReceivedAmount - totals.total, 0)
      : 0;

  const paymentStatus =
    amountPaid >= totals.total && totals.total > 0
      ? "paid"
      : amountPaid > 0
        ? "partially_paid"
        : "unpaid";

  function parseAmount(value: string): number {
    const cleaned = value.replace(/[^0-9.]/g, "");
    const parsed = Number(cleaned);

    return Number.isFinite(parsed) ? parsed : 0;
  }

  function getItemKey(item: CatalogItem): string {
    return `${item.type}-${item.id}`;
  }

  function addItem(catalogItem: CatalogItem) {
    const itemKey = getItemKey(catalogItem);

    setItems((currentItems) => {
      const existingIndex = currentItems.findIndex(
        (item) =>
          item.itemType === catalogItem.type && item.itemId === catalogItem.id,
      );

      if (existingIndex >= 0) {
        return currentItems.map((item, index) =>
          index === existingIndex
            ? {
                ...item,
                quantity: item.quantity + 1,
              }
            : item,
        );
      }

      return [
        ...currentItems,
        {
          itemType: catalogItem.type,
          itemId: catalogItem.id,
          itemName: catalogItem.name,
          unitPrice: catalogItem.price,
          quantity: 1,
        },
      ];
    });

    setAddedItemKey(itemKey);

    setTimeout(() => {
      setAddedItemKey((currentKey) =>
        currentKey === itemKey ? null : currentKey,
      );
    }, ADD_FEEDBACK_DURATION);
  }

  function updateQuantity(
    itemType: CatalogType,
    itemId: number,
    change: number,
  ) {
    setItems((currentItems) =>
      currentItems
        .map((item) => {
          if (item.itemType !== itemType || item.itemId !== itemId) {
            return item;
          }

          return {
            ...item,
            quantity: item.quantity + change,
          };
        })
        .filter((item) => item.quantity > 0),
    );
  }

  function removeItem(itemType: CatalogType, itemId: number) {
    const removedItem = items.find(
      (item) => item.itemType === itemType && item.itemId === itemId,
    );

    if (!removedItem) {
      return;
    }

    setRemovedItems((currentRemovedItems) => [
      ...currentRemovedItems,
      removedItem,
    ]);

    setItems((currentItems) =>
      currentItems.filter(
        (item) => !(item.itemType === itemType && item.itemId === itemId),
      ),
    );
  }

  function selectCustomer(customer: Customer) {
    setSelectedCustomer(customer);
    setShowCustomerPicker(false);
    setCustomerSearch("");
  }

  function handleChangeCustomer() {
    setShowCustomerPicker(true);
  }

  function handleClearOrder() {
    Alert.alert(
      "Clear this order?",
      "This will remove the customer, items, discount, and payment information from this order.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Clear Order",
          style: "destructive",
          onPress: () => {
            setSelectedCustomer(null);
            setItems([]);
            setRemovedItems([]);
            setDiscountType(null);
            setDiscountValue(0);
            setShowDiscount(false);
            setCatalogSearch("");
            setCustomerSearch("");
            setAddedItemKey(null);
            setPaymentTiming("pay_later");
            setPaymentMethod("cash");
            setCashReceived("");
            setGcashAmount("");
            setGcashReference("");
            setOtherAmount("");
            setOtherPaymentNote("");
          },
        },
      ],
    );
  }

  function resetOrderForm() {
    setSelectedCustomer(null);
    setItems([]);
    setRemovedItems([]);
    setDiscountType(null);
    setDiscountValue(0);
    setShowDiscount(false);
    setCatalogSearch("");
    setCustomerSearch("");
    setShowCustomerPicker(false);
    setAddedItemKey(null);
    setPaymentTiming("pay_later");
    setPaymentMethod("cash");
    setCashReceived("");
    setGcashAmount("");
    setGcashReference("");
    setOtherAmount("");
    setOtherPaymentNote("");
    setError("");
  }

  function handlePaymentTiming(timing: PaymentTiming) {
    setPaymentTiming(timing);

    if (timing === "pay_later") {
      setCashReceived("");
      setGcashAmount("");
      setGcashReference("");
      setOtherAmount("");
      setOtherPaymentNote("");
      setPaymentMethod("cash");
    }
  }

  function handlePaymentMethod(method: PaymentMethod) {
    setPaymentMethod(method);

    if (method !== "cash") {
      setCashReceived("");
    }

    if (method !== "gcash") {
      setGcashAmount("");
      setGcashReference("");
    }

    if (method !== "other") {
      setOtherAmount("");
      setOtherPaymentNote("");
    }
  }

  function handleDiscountType(type: DiscountType) {
    setDiscountType(type);
    setDiscountValue(0);
  }

  function handleDiscountValue(value: string) {
    const cleaned = value.replace(/[^0-9.]/g, "");
    const numericValue = Number(cleaned);

    setDiscountValue(Number.isFinite(numericValue) ? numericValue : 0);
  }

  function handleCashReceived(value: string) {
    setCashReceived(value.replace(/[^0-9.]/g, ""));
  }

  function handleGcashAmount(value: string) {
    setGcashAmount(value.replace(/[^0-9.]/g, ""));
  }

  function handleOtherAmount(value: string) {
    setOtherAmount(value.replace(/[^0-9.]/g, ""));
  }

  function handleCreateJobOrder() {
    if (!selectedCustomer) {
      Alert.alert(
        "Customer required",
        "Please select a customer before creating the Job Order.",
      );

      return;
    }

    if (items.length === 0) {
      Alert.alert(
        "Order is empty",
        "Please add at least one item to the order.",
      );

      return;
    }

    if (totals.total <= 0) {
      Alert.alert(
        "Invalid total",
        "The order total must be greater than zero.",
      );

      return;
    }

    if (
      paymentTiming === "pay_now" &&
      paymentMethod === "cash" &&
      cashReceivedAmount <= 0
    ) {
      Alert.alert(
        "Payment amount required",
        "Enter the cash received, or select Pay Later to create the order as unpaid.",
      );

      return;
    }

    if (
      paymentTiming === "pay_now" &&
      paymentMethod === "gcash" &&
      gcashPaidAmount <= 0
    ) {
      Alert.alert(
        "Payment amount required",
        "Enter the amount paid, or select Pay Later to create the order as unpaid.",
      );

      return;
    }

    if (
      paymentTiming === "pay_now" &&
      paymentMethod === "other" &&
      otherPaidAmount <= 0
    ) {
      Alert.alert(
        "Payment amount required",
        "Enter the amount paid, or select Pay Later to create the order as unpaid.",
      );

      return;
    }

    if (
      paymentTiming === "pay_now" &&
      paymentMethod === "other" &&
      !otherPaymentNote.trim()
    ) {
      Alert.alert(
        "Payment note required",
        "Enter how the Other payment was made.",
      );

      return;
    }

    if (
      paymentTiming === "pay_now" &&
      paymentMethod === "gcash" &&
      gcashPaidAmount > totals.total
    ) {
      Alert.alert(
        "Invalid payment amount",
        "GCash payment cannot be greater than the order total.",
      );

      return;
    }

    if (
      paymentTiming === "pay_now" &&
      paymentMethod === "other" &&
      otherPaidAmount > totals.total
    ) {
      Alert.alert(
        "Invalid payment amount",
        "Payment cannot be greater than the order total.",
      );

      return;
    }

    createOrder();
  }

  async function createOrder() {
    if (!selectedCustomer) {
      return;
    }

    try {
      setSaving(true);
      setError("");

      const draft: JobOrderDraft = {
        customerId: selectedCustomer.id,
        items,
        discountType,
        discountValue,
        notes: "",
      };

      const paymentInput =
        paymentTiming === "pay_later"
          ? undefined
          : paymentMethod === "cash"
            ? {
                paymentMethod: "cash" as const,
                amount: amountPaid,
                cashReceived: cashReceivedAmount,
              }
            : paymentMethod === "gcash"
              ? {
                  paymentMethod: "gcash" as const,
                  amount: gcashPaidAmount,
                  referenceNumber: gcashReference.trim() || undefined,
                }
              : {
                  paymentMethod: "other" as const,
                  amount: otherPaidAmount,
                  paymentNote: otherPaymentNote.trim(),
                };

      const result = await createJobOrder(
        draft,
        paymentInput,
        user?.id ?? null,
      );

      if (removedItems.length > 0) {
        try {
          await doAction("job_order.item_removed", {
            jobOrderId: result.jobOrder.id,
            jobOrderNumber: result.jobOrder.jobOrderNumber,
            removedItems,
          });
        } catch (auditError) {
          console.error(
            "Job Order was created, but the item removal audit could not be recorded:",
            auditError,
          );
        }
      }

      resetOrderForm();

      router.replace({
        pathname: "/job-order-created",
        params: {
          id: result.jobOrder.id.toString(),
        },
      });
    } catch (err) {
      console.error("Failed to create Job Order:", err);

      setError(
        err instanceof Error ? err.message : "Unable to create the Job Order.",
      );
    } finally {
      setSaving(false);
    }
  }

  function getCatalogIcon(type: CatalogType): keyof typeof Ionicons.glyphMap {
    switch (type) {
      case "service":
        return "water-outline";

      case "product":
        return "cube-outline";

      case "bundle":
        return "gift-outline";
    }
  }

  function getCatalogLabel(type: CatalogType): string {
    switch (type) {
      case "service":
        return "Services";

      case "product":
        return "Products";

      case "bundle":
        return "Bundles";
    }
  }

  function renderCatalogItem({ item }: { item: CatalogItem }) {
    const itemKey = getItemKey(item);
    const isAdded = addedItemKey === itemKey;

    return (
      <AppCard
        onPress={() => addItem(item)}
        padding={spacing.md}
        style={[
          styles.catalogCard,
          isAdded && styles.catalogCardAdded,
          {
            width: catalogCardWidth,
          },
        ]}
      >
        <View style={styles.catalogTopRow}>
          <View
            style={[
              styles.catalogIcon,
              item.type === "bundle" && styles.bundleIcon,
              isAdded && styles.catalogIconAdded,
            ]}
          >
            <Ionicons
              name={isAdded ? "checkmark-circle" : getCatalogIcon(item.type)}
              size={22}
              color={isAdded ? colors.success : colors.primary}
            />
          </View>

          <View style={styles.catalogInfo}>
            <Text style={styles.catalogName} numberOfLines={2}>
              {item.name}
            </Text>

            <Text style={styles.catalogType}>
              {item.type === "service"
                ? "Service"
                : item.type === "product"
                  ? "Product"
                  : "Bundle"}
            </Text>
          </View>
        </View>

        <View style={styles.catalogFooter}>
          <Text style={styles.catalogPrice}>{formatCurrency(item.price)}</Text>

          <View style={styles.addIcon}>
            <Ionicons name="add" size={20} color={colors.white} />
          </View>
        </View>
      </AppCard>
    );
  }

  function renderOrderItem({ item }: { item: JobOrderDraftItem }) {
    const lineTotal = item.unitPrice * item.quantity;

    return (
      <View style={styles.orderItem}>
        <View style={styles.orderItemMain}>
          <Text style={styles.orderItemName} numberOfLines={2}>
            {item.itemName}
          </Text>

          <Text style={styles.orderItemPrice}>
            {formatCurrency(item.unitPrice)} × {item.quantity}
          </Text>
        </View>

        <View style={styles.orderItemRight}>
          <Text style={styles.orderItemTotal}>{formatCurrency(lineTotal)}</Text>

          <View style={styles.quantityControls}>
            <Pressable
              accessibilityRole="button"
              onPress={() => updateQuantity(item.itemType, item.itemId, -1)}
              style={styles.quantityButton}
            >
              <Ionicons name="remove" size={16} color={colors.text} />
            </Pressable>

            <Text style={styles.quantityValue}>{item.quantity}</Text>

            <Pressable
              accessibilityRole="button"
              onPress={() => updateQuantity(item.itemType, item.itemId, 1)}
              style={styles.quantityButton}
            >
              <Ionicons name="add" size={16} color={colors.text} />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => removeItem(item.itemType, item.itemId)}
              style={styles.removeButton}
            >
              <Ionicons name="trash-outline" size={17} color={colors.danger} />
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  function renderCustomerPicker() {
    if (!showCustomerPicker) {
      return null;
    }

    return (
      <View style={styles.customerPickerOverlay}>
        <Pressable
          style={styles.overlayDismiss}
          onPress={() => setShowCustomerPicker(false)}
        />

        <AppCard
          padding={spacing.lg}
          style={[
            styles.customerPicker,
            isTablet && styles.customerPickerTablet,
          ]}
        >
          <View style={styles.pickerHeader}>
            <View>
              <Text style={styles.pickerTitle}>Select Customer</Text>

              <Text style={styles.pickerSubtitle}>Search by name or phone</Text>
            </View>

            <Pressable
              onPress={() => setShowCustomerPicker(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={22} color={colors.text} />
            </Pressable>
          </View>

          <AppInput
            value={customerSearch}
            onChangeText={setCustomerSearch}
            placeholder="Search customers..."
            autoCapitalize="none"
            autoCorrect={false}
          />

          <View style={styles.customerList}>
            {filteredCustomers.length === 0 ? (
              <View style={styles.noCustomers}>
                <Ionicons
                  name="people-outline"
                  size={32}
                  color={colors.textMuted}
                />

                <Text style={styles.noCustomersText}>No customers found</Text>
              </View>
            ) : (
              <FlatList
                data={filteredCustomers}
                keyExtractor={(customer) => customer.id.toString()}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => selectCustomer(item)}
                    style={styles.customerOption}
                  >
                    <View style={styles.customerAvatar}>
                      <Text style={styles.customerAvatarText}>
                        {item.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>

                    <View style={styles.customerOptionInfo}>
                      <Text style={styles.customerOptionName} numberOfLines={1}>
                        {item.name}
                      </Text>

                      {item.phone ? (
                        <Text style={styles.customerOptionPhone}>
                          {item.phone}
                        </Text>
                      ) : null}
                    </View>

                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={colors.textMuted}
                    />
                  </Pressable>
                )}
              />
            )}
          </View>

          <AppButton
            title="Add New Customer"
            icon="person-add-outline"
            variant="secondary"
            fullWidth
            onPress={() => {
              setShowCustomerPicker(false);

              Alert.alert(
                "Add Customer",
                "Customer creation can be connected here next.",
              );
            }}
          />
        </AppCard>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <LoadingState message="Loading Job Order..." />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <PageHero
        icon="receipt-outline"
        title="New Job Order"
        subtitle="Create a new laundry transaction"
        onBack={() => router.replace("/")}
      />

      {error ? (
        <View
          style={[
            styles.errorBanner,
            {
              maxWidth: MAX_CONTENT_WIDTH,
            },
          ]}
        >
          <Ionicons
            name="alert-circle-outline"
            size={20}
            color={colors.danger}
          />

          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          {
            maxWidth: MAX_CONTENT_WIDTH,
            alignSelf: "center",
            width: "100%",
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.stepSection}>
          <View style={styles.stepHeader}>
            <View
              style={[
                styles.stepNumber,
                selectedCustomer && styles.stepNumberComplete,
              ]}
            >
              {selectedCustomer ? (
                <Ionicons name="checkmark" size={17} color={colors.white} />
              ) : (
                <Text style={styles.stepNumberText}>1</Text>
              )}
            </View>

            <View style={styles.stepHeaderText}>
              <Text style={styles.stepTitle}>Customer</Text>

              <Text style={styles.stepSubtitle}>
                {selectedCustomer
                  ? "Customer selected"
                  : "Who is this order for?"}
              </Text>
            </View>
          </View>

          <AppCard
            onPress={
              selectedCustomer
                ? handleChangeCustomer
                : () => setShowCustomerPicker(true)
            }
            padding={spacing.md}
            style={styles.customerCard}
          >
            <View style={styles.customerCardIcon}>
              <Ionicons
                name="person-outline"
                size={22}
                color={colors.primary}
              />
            </View>

            <View style={styles.customerCardInfo}>
              {selectedCustomer ? (
                <>
                  <Text style={styles.customerCardName} numberOfLines={1}>
                    {selectedCustomer.name}
                  </Text>

                  {selectedCustomer.phone ? (
                    <Text style={styles.customerCardPhone}>
                      {selectedCustomer.phone}
                    </Text>
                  ) : null}
                </>
              ) : (
                <>
                  <Text style={styles.customerPlaceholder}>
                    Select a customer
                  </Text>

                  <Text style={styles.customerHint}>
                    Required before adding items
                  </Text>
                </>
              )}
            </View>

            {selectedCustomer ? (
              <View style={styles.changeCustomerButton}>
                <Text style={styles.changeCustomerText}>Change</Text>
              </View>
            ) : (
              <Ionicons
                name="chevron-forward"
                size={22}
                color={colors.textMuted}
              />
            )}
          </AppCard>
        </View>

        {!selectedCustomer ? (
          <View style={styles.waitingState}>
            <View style={styles.waitingIcon}>
              <Ionicons
                name="arrow-up-outline"
                size={28}
                color={colors.primary}
              />
            </View>

            <Text style={styles.waitingTitle}>Select a customer to start</Text>

            <Text style={styles.waitingText}>
              Once a customer is selected, you can add services, products, and
              bundles to this order.
            </Text>

            <AppButton
              title="Select Customer"
              icon="person-outline"
              fullWidth={!isTablet}
              onPress={() => setShowCustomerPicker(true)}
            />
          </View>
        ) : (
          <>
            <View style={[styles.stepSection, styles.stepSectionSpaced]}>
              <View style={styles.stepHeader}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>2</Text>
                </View>

                <View style={styles.stepHeaderText}>
                  <Text style={styles.stepTitle}>Add Items</Text>

                  <Text style={styles.stepSubtitle}>
                    Choose what the customer is buying
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.categoryRow,
                  isTablet && styles.categoryRowTablet,
                ]}
              >
                {(["service", "product", "bundle"] as CatalogType[]).map(
                  (type) => {
                    const active = catalogType === type;

                    return (
                      <Pressable
                        key={type}
                        onPress={() => {
                          setCatalogType(type);
                          setCatalogSearch("");
                        }}
                        style={[
                          styles.categoryButton,
                          active && styles.categoryButtonActive,
                        ]}
                      >
                        <Ionicons
                          name={getCatalogIcon(type)}
                          size={19}
                          color={active ? colors.primary : colors.textSecondary}
                        />

                        <Text
                          style={[
                            styles.categoryText,
                            active && styles.categoryTextActive,
                          ]}
                        >
                          {getCatalogLabel(type)}
                        </Text>
                      </Pressable>
                    );
                  },
                )}
              </View>

              <AppInput
                value={catalogSearch}
                onChangeText={setCatalogSearch}
                placeholder={`Search ${getCatalogLabel(
                  catalogType,
                ).toLowerCase()}...`}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <View style={styles.catalogGrid}>
                {filteredCatalogItems.length === 0 ? (
                  <View style={styles.catalogEmpty}>
                    <View style={styles.catalogEmptyIcon}>
                      <Ionicons
                        name={getCatalogIcon(catalogType)}
                        size={28}
                        color={colors.textMuted}
                      />
                    </View>

                    <Text style={styles.catalogEmptyTitle}>
                      No {getCatalogLabel(catalogType).toLowerCase()} found
                    </Text>

                    <Text style={styles.catalogEmptyText}>
                      Try another search.
                    </Text>
                  </View>
                ) : (
                  <FlatList
                    key={`catalog-${numColumns}`}
                    data={filteredCatalogItems}
                    numColumns={numColumns}
                    scrollEnabled={false}
                    keyExtractor={(item) => `${item.type}-${item.id}`}
                    columnWrapperStyle={styles.catalogRow}
                    renderItem={renderCatalogItem}
                  />
                )}
              </View>
            </View>

            {items.length > 0 ? (
              <View style={[styles.stepSection, styles.stepSectionSpaced]}>
                <View style={styles.stepHeader}>
                  <View style={[styles.stepNumber, styles.stepNumberCurrent]}>
                    <Text style={styles.stepNumberText}>3</Text>
                  </View>

                  <View style={styles.stepHeaderText}>
                    <Text style={styles.stepTitle}>Review Order</Text>

                    <Text style={styles.stepSubtitle}>
                      Check the items, discount, and payment
                    </Text>
                  </View>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Clear order"
                    onPress={handleClearOrder}
                    style={styles.clearOrderButton}
                  >
                    <Text style={styles.clearOrderText}>Clear</Text>
                  </Pressable>

                  <View style={styles.itemCountBadge}>
                    <Text style={styles.itemCountText}>
                      {items.reduce((total, item) => total + item.quantity, 0)}
                    </Text>
                  </View>
                </View>

                <AppCard padding={spacing.lg} style={styles.orderCard}>
                  <View style={styles.orderItems}>
                    {items.map((item) => (
                      <View key={`${item.itemType}-${item.itemId}`}>
                        {renderOrderItem({ item })}
                      </View>
                    ))}
                  </View>

                  <View style={styles.summaryDivider} />

                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Subtotal</Text>

                    <Text style={styles.summaryValue}>
                      {formatCurrency(totals.subtotal)}
                    </Text>
                  </View>

                  <View style={styles.discountSection}>
                    <View style={styles.discountHeader}>
                      <View>
                        <Text style={styles.summaryLabel}>Discount</Text>

                        {discountType && discountValue > 0 ? (
                          <Text style={styles.discountApplied}>
                            {discountType === "percentage"
                              ? `${discountValue}%`
                              : formatCurrency(discountValue)}
                          </Text>
                        ) : null}
                      </View>

                      <Pressable
                        onPress={() => setShowDiscount((current) => !current)}
                        style={styles.discountToggle}
                      >
                        <Text style={styles.discountToggleText}>
                          {showDiscount
                            ? "Done"
                            : discountType && discountValue > 0
                              ? "Edit"
                              : "Add"}
                        </Text>
                      </Pressable>
                    </View>

                    {showDiscount ? (
                      <View style={styles.discountEditor}>
                        <View style={styles.discountTypeRow}>
                          <Pressable
                            onPress={() => handleDiscountType("percentage")}
                            style={[
                              styles.discountTypeButton,
                              discountType === "percentage" &&
                                styles.discountTypeButtonActive,
                            ]}
                          >
                            <Ionicons
                              name="pricetag-outline"
                              size={17}
                              color={
                                discountType === "percentage"
                                  ? colors.primary
                                  : colors.textSecondary
                              }
                            />

                            <Text
                              style={[
                                styles.discountTypeText,
                                discountType === "percentage" &&
                                  styles.discountTypeTextActive,
                              ]}
                            >
                              Percentage
                            </Text>
                          </Pressable>

                          <Pressable
                            onPress={() => handleDiscountType("fixed")}
                            style={[
                              styles.discountTypeButton,
                              discountType === "fixed" &&
                                styles.discountTypeButtonActive,
                            ]}
                          >
                            <Ionicons
                              name="cash-outline"
                              size={17}
                              color={
                                discountType === "fixed"
                                  ? colors.primary
                                  : colors.textSecondary
                              }
                            />

                            <Text
                              style={[
                                styles.discountTypeText,
                                discountType === "fixed" &&
                                  styles.discountTypeTextActive,
                              ]}
                            >
                              Fixed Amount
                            </Text>
                          </Pressable>
                        </View>

                        {discountType ? (
                          <AppInput
                            value={
                              discountValue ? discountValue.toString() : ""
                            }
                            onChangeText={handleDiscountValue}
                            keyboardType="decimal-pad"
                            placeholder={
                              discountType === "percentage"
                                ? "Enter percentage"
                                : "Enter amount"
                            }
                          />
                        ) : (
                          <Text style={styles.discountHint}>
                            Choose a discount type first.
                          </Text>
                        )}
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.summaryTotal}>
                    <Text style={styles.totalLabel}>TOTAL</Text>

                    <Text style={styles.totalValue}>
                      {formatCurrency(totals.total)}
                    </Text>
                  </View>

                  <View style={styles.paymentSection}>
                    <View style={styles.paymentHeader}>
                      <View style={styles.paymentHeaderIcon}>
                        <Ionicons
                          name="wallet-outline"
                          size={21}
                          color={colors.primary}
                        />
                      </View>

                      <View style={styles.paymentHeaderText}>
                        <Text style={styles.paymentTitle}>Payment</Text>

                        <Text style={styles.paymentSubtitle}>
                          Choose when the customer will pay
                        </Text>
                      </View>
                    </View>

                    <View style={styles.paymentTimingRow}>
                      <Pressable
                        accessibilityRole="radio"
                        accessibilityState={{
                          selected: paymentTiming === "pay_later",
                        }}
                        onPress={() => handlePaymentTiming("pay_later")}
                        style={[
                          styles.paymentTimingButton,
                          paymentTiming === "pay_later" &&
                            styles.paymentTimingButtonActive,
                        ]}
                      >
                        <View
                          style={[
                            styles.paymentTimingIcon,
                            paymentTiming === "pay_later" &&
                              styles.paymentTimingIconActive,
                          ]}
                        >
                          <Ionicons
                            name="time-outline"
                            size={21}
                            color={
                              paymentTiming === "pay_later"
                                ? colors.primary
                                : colors.textSecondary
                            }
                          />
                        </View>

                        <View style={styles.paymentTimingText}>
                          <Text
                            style={[
                              styles.paymentTimingTitle,
                              paymentTiming === "pay_later" &&
                                styles.paymentTimingTitleActive,
                            ]}
                          >
                            Pay Later
                          </Text>

                          <Text style={styles.paymentTimingDescription}>
                            Pay when claiming
                          </Text>
                        </View>

                        {paymentTiming === "pay_later" ? (
                          <Ionicons
                            name="checkmark-circle"
                            size={21}
                            color={colors.primary}
                          />
                        ) : null}
                      </Pressable>

                      <Pressable
                        accessibilityRole="radio"
                        accessibilityState={{
                          selected: paymentTiming === "pay_now",
                        }}
                        onPress={() => handlePaymentTiming("pay_now")}
                        style={[
                          styles.paymentTimingButton,
                          paymentTiming === "pay_now" &&
                            styles.paymentTimingButtonActive,
                        ]}
                      >
                        <View
                          style={[
                            styles.paymentTimingIcon,
                            paymentTiming === "pay_now" &&
                              styles.paymentTimingIconActive,
                          ]}
                        >
                          <Ionicons
                            name="cash-outline"
                            size={21}
                            color={
                              paymentTiming === "pay_now"
                                ? colors.primary
                                : colors.textSecondary
                            }
                          />
                        </View>

                        <View style={styles.paymentTimingText}>
                          <Text
                            style={[
                              styles.paymentTimingTitle,
                              paymentTiming === "pay_now" &&
                                styles.paymentTimingTitleActive,
                            ]}
                          >
                            Pay Now
                          </Text>

                          <Text style={styles.paymentTimingDescription}>
                            Pay at drop-off
                          </Text>
                        </View>

                        {paymentTiming === "pay_now" ? (
                          <Ionicons
                            name="checkmark-circle"
                            size={21}
                            color={colors.primary}
                          />
                        ) : null}
                      </Pressable>
                    </View>

                    {paymentTiming === "pay_now" ? (
                      <View style={styles.paymentEditor}>
                        <View style={styles.paymentMethodRow}>
                          <Pressable
                            onPress={() => handlePaymentMethod("cash")}
                            style={[
                              styles.paymentMethodButton,
                              paymentMethod === "cash" &&
                                styles.paymentMethodButtonActive,
                            ]}
                          >
                            <Ionicons
                              name="cash-outline"
                              size={19}
                              color={
                                paymentMethod === "cash"
                                  ? colors.primary
                                  : colors.textSecondary
                              }
                            />

                            <Text
                              style={[
                                styles.paymentMethodText,
                                paymentMethod === "cash" &&
                                  styles.paymentMethodTextActive,
                              ]}
                            >
                              Cash
                            </Text>
                          </Pressable>

                          <Pressable
                            onPress={() => handlePaymentMethod("gcash")}
                            style={[
                              styles.paymentMethodButton,
                              paymentMethod === "gcash" &&
                                styles.paymentMethodButtonActive,
                            ]}
                          >
                            <Ionicons
                              name="phone-portrait-outline"
                              size={19}
                              color={
                                paymentMethod === "gcash"
                                  ? colors.primary
                                  : colors.textSecondary
                              }
                            />

                            <Text
                              style={[
                                styles.paymentMethodText,
                                paymentMethod === "gcash" &&
                                  styles.paymentMethodTextActive,
                              ]}
                            >
                              GCash
                            </Text>
                          </Pressable>

                          <Pressable
                            onPress={() => handlePaymentMethod("other")}
                            style={[
                              styles.paymentMethodButton,
                              paymentMethod === "other" &&
                                styles.paymentMethodButtonActive,
                            ]}
                          >
                            <Ionicons
                              name="ellipsis-horizontal-circle-outline"
                              size={19}
                              color={
                                paymentMethod === "other"
                                  ? colors.primary
                                  : colors.textSecondary
                              }
                            />

                            <Text
                              style={[
                                styles.paymentMethodText,
                                paymentMethod === "other" &&
                                  styles.paymentMethodTextActive,
                              ]}
                            >
                              Other
                            </Text>
                          </Pressable>
                        </View>

                        {paymentMethod === "cash" ? (
                          <>
                            <AppInput
                              label="Cash Received"
                              required
                              value={cashReceived}
                              onChangeText={handleCashReceived}
                              keyboardType="decimal-pad"
                              placeholder="0.00"
                            />

                            <View style={styles.paymentCalculation}>
                              <View style={styles.paymentCalculationRow}>
                                <Text style={styles.paymentCalculationLabel}>
                                  Amount applied
                                </Text>

                                <Text style={styles.paymentCalculationValue}>
                                  {formatCurrency(amountPaid)}
                                </Text>
                              </View>

                              {changeAmount > 0 ? (
                                <View
                                  style={[
                                    styles.paymentCalculationRow,
                                    styles.changeRow,
                                  ]}
                                >
                                  <Text style={styles.changeLabel}>Change</Text>

                                  <Text style={styles.changeValue}>
                                    {formatCurrency(changeAmount)}
                                  </Text>
                                </View>
                              ) : null}

                              {balance > 0 ? (
                                <View style={styles.paymentCalculationRow}>
                                  <Text style={styles.balanceLabel}>
                                    Balance
                                  </Text>

                                  <Text style={styles.balanceValue}>
                                    {formatCurrency(balance)}
                                  </Text>
                                </View>
                              ) : null}
                            </View>
                          </>
                        ) : paymentMethod === "gcash" ? (
                          <>
                            <AppInput
                              label="Amount Paid"
                              required
                              value={gcashAmount}
                              onChangeText={handleGcashAmount}
                              keyboardType="decimal-pad"
                              placeholder="0.00"
                            />

                            <AppInput
                              label="Reference Number"
                              value={gcashReference}
                              onChangeText={setGcashReference}
                              placeholder="Optional"
                              autoCapitalize="characters"
                              autoCorrect={false}
                            />

                            <View style={styles.paymentCalculation}>
                              <View style={styles.paymentCalculationRow}>
                                <Text style={styles.paymentCalculationLabel}>
                                  Amount applied
                                </Text>

                                <Text style={styles.paymentCalculationValue}>
                                  {formatCurrency(amountPaid)}
                                </Text>
                              </View>

                              {balance > 0 ? (
                                <View style={styles.paymentCalculationRow}>
                                  <Text style={styles.balanceLabel}>
                                    Balance
                                  </Text>

                                  <Text style={styles.balanceValue}>
                                    {formatCurrency(balance)}
                                  </Text>
                                </View>
                              ) : null}
                            </View>
                          </>
                        ) : (
                          <>
                            <AppInput
                              label="Amount Paid"
                              required
                              value={otherAmount}
                              onChangeText={handleOtherAmount}
                              keyboardType="decimal-pad"
                              placeholder="0.00"
                            />

                            <AppInput
                              label="How was the payment made?"
                              required
                              value={otherPaymentNote}
                              onChangeText={setOtherPaymentNote}
                              placeholder="e.g. Maya, bank transfer, credit card"
                              autoCapitalize="sentences"
                              autoCorrect
                            />

                            <View style={styles.paymentCalculation}>
                              <View style={styles.paymentCalculationRow}>
                                <Text style={styles.paymentCalculationLabel}>
                                  Amount applied
                                </Text>

                                <Text style={styles.paymentCalculationValue}>
                                  {formatCurrency(amountPaid)}
                                </Text>
                              </View>

                              {balance > 0 ? (
                                <View style={styles.paymentCalculationRow}>
                                  <Text style={styles.balanceLabel}>
                                    Balance
                                  </Text>

                                  <Text style={styles.balanceValue}>
                                    {formatCurrency(balance)}
                                  </Text>
                                </View>
                              ) : null}
                            </View>
                          </>
                        )}
                      </View>
                    ) : null}

                    <View style={styles.paymentStatusRow}>
                      <View style={styles.paymentStatusInfo}>
                        <Text style={styles.paymentStatusLabel}>
                          Payment Status
                        </Text>

                        <Text style={styles.paymentStatusDescription}>
                          {paymentStatus === "paid"
                            ? "This order will be fully paid now."
                            : paymentStatus === "partially_paid"
                              ? "A balance will remain after this payment."
                              : "No payment will be recorded for this order yet."}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.paymentStatusBadge,
                          paymentStatus === "paid"
                            ? styles.paymentStatusPaid
                            : paymentStatus === "partially_paid"
                              ? styles.paymentStatusPartial
                              : styles.paymentStatusUnpaid,
                        ]}
                      >
                        <View
                          style={[
                            styles.paymentStatusDot,
                            paymentStatus === "paid"
                              ? styles.paymentStatusDotPaid
                              : paymentStatus === "partially_paid"
                                ? styles.paymentStatusDotPartial
                                : styles.paymentStatusDotUnpaid,
                          ]}
                        />

                        <Text
                          style={[
                            styles.paymentStatusBadgeText,
                            paymentStatus === "paid"
                              ? styles.paymentStatusBadgeTextPaid
                              : paymentStatus === "partially_paid"
                                ? styles.paymentStatusBadgeTextPartial
                                : styles.paymentStatusBadgeTextUnpaid,
                          ]}
                        >
                          {paymentStatus === "paid"
                            ? "PAID"
                            : paymentStatus === "partially_paid"
                              ? "PARTIALLY PAID"
                              : "UNPAID"}
                        </Text>
                      </View>
                    </View>

                    {paymentStatus !== "paid" ? (
                      <View style={styles.balanceSummary}>
                        <Text style={styles.balanceSummaryLabel}>Balance</Text>

                        <Text style={styles.balanceSummaryValue}>
                          {formatCurrency(balance)}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.createSection}>
                    <AppButton
                      title="Create Job Order"
                      icon="checkmark-circle-outline"
                      fullWidth
                      loading={saving}
                      disabled={
                        !selectedCustomer ||
                        items.length === 0 ||
                        totals.total <= 0
                      }
                      onPress={handleCreateJobOrder}
                    />

                    <Text style={styles.createHint}>
                      The Job Order will be created now. Payment can be recorded
                      later if there is a remaining balance.
                    </Text>
                  </View>
                </AppCard>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>

      {renderCustomerPicker()}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  errorBanner: {
    width: "100%",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingHorizontal: PAGE_PADDING,
    paddingVertical: spacing.md,
  },

  errorText: {
    flex: 1,
    ...typography.small,
    color: colors.danger,
  },

  scroll: {
    flex: 1,
  },

  scrollContent: {
    padding: PAGE_PADDING,
    paddingBottom: 40,
  },

  stepSection: {
    width: "100%",
  },

  stepSectionSpaced: {
    marginTop: spacing["2xl"],
  },

  stepHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },

  stepNumber: {
    width: 34,
    height: 34,
    borderRadius: theme.radius.full,
    backgroundColor: colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },

  stepNumberComplete: {
    backgroundColor: colors.success,
  },

  stepNumberCurrent: {
    backgroundColor: colors.primary,
  },

  stepNumberText: {
    ...typography.bodyMedium,
    color: colors.primary,
  },

  stepHeaderText: {
    flex: 1,
  },

  stepTitle: {
    ...typography.h2,
    color: colors.text,
  },

  stepSubtitle: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: 2,
  },

  clearOrderButton: {
    minHeight: 32,
    paddingHorizontal: spacing.sm,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.xs,
  },

  clearOrderText: {
    ...typography.caption,
    color: colors.textMuted,
  },

  customerCard: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
  },

  customerCardIcon: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.md,
    backgroundColor: colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },

  customerCardInfo: {
    flex: 1,
  },

  customerCardName: {
    ...typography.bodyMedium,
    color: colors.text,
  },

  customerCardPhone: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: 2,
  },

  customerPlaceholder: {
    ...typography.bodyMedium,
    color: colors.text,
  },

  customerHint: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },

  changeCustomerButton: {
    minHeight: 36,
    paddingHorizontal: spacing.md,
    borderRadius: theme.radius.full,
    backgroundColor: colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },

  changeCustomerText: {
    ...typography.caption,
    color: colors.primary,
  },

  waitingState: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: theme.radius.lg,
    paddingVertical: spacing["2xl"],
    paddingHorizontal: spacing.lg,
    marginTop: spacing["2xl"],
  },

  waitingIcon: {
    width: 58,
    height: 58,
    borderRadius: theme.radius.full,
    backgroundColor: colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.md,
  },

  waitingTitle: {
    ...typography.h3,
    color: colors.text,
    textAlign: "center",
  },

  waitingText: {
    ...typography.small,
    color: colors.textSecondary,
    textAlign: "center",
    maxWidth: 360,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },

  categoryRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },

  categoryRowTablet: {
    maxWidth: 620,
  },

  categoryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: theme.radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
  },

  categoryButtonActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primaryLight,
  },

  categoryText: {
    ...typography.caption,
    color: colors.textSecondary,
  },

  categoryTextActive: {
    color: colors.primary,
  },

  catalogGrid: {
    marginTop: spacing.md,
  },

  catalogRow: {
    justifyContent: "space-between",
    marginBottom: GRID_GAP,
  },

  catalogCard: {
    minHeight: 136,
    justifyContent: "space-between",
  },

  catalogCardAdded: {
    backgroundColor: colors.successLight,
  },

  catalogTopRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 52,
  },

  catalogIcon: {
    width: 42,
    height: 42,
    borderRadius: theme.radius.md,
    backgroundColor: colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.sm,
  },

  catalogIconAdded: {
    backgroundColor: colors.surface,
  },

  bundleIcon: {
    backgroundColor: colors.accentLight,
  },

  catalogInfo: {
    flex: 1,
    minWidth: 0,
  },

  catalogName: {
    ...typography.bodyMedium,
    color: colors.text,
  },

  catalogType: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },

  catalogFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.md,
  },

  catalogPrice: {
    ...typography.bodyMedium,
    color: colors.primaryDark,
  },

  addIcon: {
    width: 32,
    height: 32,
    borderRadius: theme.radius.full,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },

  catalogEmpty: {
    backgroundColor: colors.surface,
    borderRadius: theme.radius.lg,
    paddingVertical: spacing["2xl"],
    paddingHorizontal: spacing.lg,
    alignItems: "center",
  },

  catalogEmptyIcon: {
    width: 58,
    height: 58,
    borderRadius: theme.radius.full,
    backgroundColor: colors.surfaceSoft,
    justifyContent: "center",
    alignItems: "center",
  },

  catalogEmptyTitle: {
    ...typography.h3,
    color: colors.text,
    marginTop: spacing.md,
  },

  catalogEmptyText: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },

  orderCard: {
    width: "100%",
  },

  orderItems: {
    width: "100%",
  },

  orderItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  orderItemMain: {
    flex: 1,
    paddingRight: spacing.md,
  },

  orderItemName: {
    ...typography.bodyMedium,
    color: colors.text,
  },

  orderItemPrice: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 3,
  },

  orderItemRight: {
    alignItems: "flex-end",
  },

  orderItemTotal: {
    ...typography.bodyMedium,
    color: colors.text,
    marginBottom: spacing.sm,
  },

  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },

  quantityButton: {
    width: 30,
    height: 30,
    borderRadius: theme.radius.full,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
  },

  quantityValue: {
    minWidth: 24,
    textAlign: "center",
    ...typography.bodyMedium,
    color: colors.text,
  },

  removeButton: {
    width: 30,
    height: 30,
    borderRadius: theme.radius.full,
    backgroundColor: colors.dangerLight,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: spacing.xs,
  },

  itemCountBadge: {
    minWidth: 30,
    height: 30,
    paddingHorizontal: spacing.sm,
    borderRadius: theme.radius.full,
    backgroundColor: colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: spacing.sm,
  },

  itemCountText: {
    ...typography.caption,
    color: colors.primary,
  },

  summaryDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },

  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  summaryLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },

  summaryValue: {
    ...typography.bodyMedium,
    color: colors.text,
  },

  discountSection: {
    marginTop: spacing.md,
  },

  discountHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  discountApplied: {
    ...typography.caption,
    color: colors.primary,
    marginTop: 2,
  },

  discountToggle: {
    minHeight: 36,
    paddingHorizontal: spacing.md,
    borderRadius: theme.radius.full,
    backgroundColor: colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },

  discountToggleText: {
    ...typography.caption,
    color: colors.primary,
  },

  discountEditor: {
    marginTop: spacing.md,
    gap: spacing.md,
  },

  discountTypeRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },

  discountTypeButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSoft,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
  },

  discountTypeButtonActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primaryLight,
  },

  discountTypeText: {
    ...typography.caption,
    color: colors.textSecondary,
  },

  discountTypeTextActive: {
    color: colors.primary,
  },

  discountHint: {
    ...typography.caption,
    color: colors.textMuted,
  },

  summaryTotal: {
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  totalLabel: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },

  totalValue: {
    ...typography.h1,
    color: colors.primaryDark,
  },

  paymentSection: {
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
  },

  paymentHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  paymentHeaderIcon: {
    width: 42,
    height: 42,
    borderRadius: theme.radius.md,
    backgroundColor: colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.sm,
  },

  paymentHeaderText: {
    flex: 1,
  },

  paymentTitle: {
    ...typography.bodyMedium,
    color: colors.text,
  },

  paymentSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },

  paymentTimingRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },

  paymentTimingButton: {
    flex: 1,
    minHeight: 76,
    borderRadius: theme.radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
  },

  paymentTimingButtonActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },

  paymentTimingIcon: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.md,
    backgroundColor: colors.surfaceSoft,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.sm,
  },

  paymentTimingIconActive: {
    backgroundColor: colors.surface,
  },

  paymentTimingText: {
    flex: 1,
  },

  paymentTimingTitle: {
    ...typography.bodyMedium,
    color: colors.text,
  },

  paymentTimingTitleActive: {
    color: colors.primaryDark,
  },

  paymentTimingDescription: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },

  paymentEditor: {
    marginTop: spacing.md,
    gap: spacing.md,
  },

  paymentMethodRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },

  paymentMethodButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: theme.radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },

  paymentMethodButtonActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primaryLight,
  },

  paymentMethodText: {
    ...typography.caption,
    color: colors.textSecondary,
  },

  paymentMethodTextActive: {
    color: colors.primary,
  },

  paymentCalculation: {
    backgroundColor: colors.surface,
    borderRadius: theme.radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },

  paymentCalculationRow: {
    minHeight: 30,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  paymentCalculationLabel: {
    ...typography.small,
    color: colors.textSecondary,
  },

  paymentCalculationValue: {
    ...typography.bodyMedium,
    color: colors.text,
  },

  changeRow: {
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  changeLabel: {
    ...typography.bodyMedium,
    color: colors.success,
  },

  changeValue: {
    ...typography.h3,
    color: colors.success,
  },

  balanceLabel: {
    ...typography.bodyMedium,
    color: colors.warning,
  },

  balanceValue: {
    ...typography.bodyMedium,
    color: colors.warning,
  },

  paymentStatusRow: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },

  paymentStatusInfo: {
    flex: 1,
  },

  paymentStatusLabel: {
    ...typography.bodyMedium,
    color: colors.text,
  },

  paymentStatusDescription: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
    maxWidth: 320,
  },

  paymentStatusBadge: {
    minHeight: 30,
    paddingHorizontal: spacing.sm,
    borderRadius: theme.radius.full,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  paymentStatusPaid: {
    backgroundColor: colors.successLight,
  },

  paymentStatusPartial: {
    backgroundColor: colors.warningLight,
  },

  paymentStatusUnpaid: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },

  paymentStatusDot: {
    width: 7,
    height: 7,
    borderRadius: theme.radius.full,
  },

  paymentStatusDotPaid: {
    backgroundColor: colors.success,
  },

  paymentStatusDotPartial: {
    backgroundColor: colors.warning,
  },

  paymentStatusDotUnpaid: {
    backgroundColor: colors.textMuted,
  },

  paymentStatusBadgeText: {
    ...typography.caption,
  },

  paymentStatusBadgeTextPaid: {
    color: colors.success,
  },

  paymentStatusBadgeTextPartial: {
    color: colors.warning,
  },

  paymentStatusBadgeTextUnpaid: {
    color: colors.textSecondary,
  },

  balanceSummary: {
    marginTop: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: colors.warningLight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  balanceSummaryLabel: {
    ...typography.bodyMedium,
    color: colors.warning,
  },

  balanceSummaryValue: {
    ...typography.h3,
    color: colors.warning,
  },

  createSection: {
    marginTop: spacing.lg,
  },

  createHint: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.sm,
  },

  customerPickerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },

  overlayDismiss: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(31, 29, 36, 0.28)",
  },

  customerPicker: {
    width: "92%",
    maxHeight: "82%",
  },

  customerPickerTablet: {
    maxWidth: 560,
  },

  pickerHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },

  pickerTitle: {
    ...typography.h2,
    color: colors.text,
  },

  pickerSubtitle: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: 2,
  },

  closeButton: {
    width: 38,
    height: 38,
    borderRadius: theme.radius.full,
    backgroundColor: colors.surfaceSoft,
    justifyContent: "center",
    alignItems: "center",
  },

  customerList: {
    minHeight: 180,
    maxHeight: 360,
    marginVertical: spacing.md,
  },

  customerOption: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  customerAvatar: {
    width: 42,
    height: 42,
    borderRadius: theme.radius.full,
    backgroundColor: colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },

  customerAvatarText: {
    ...typography.bodyMedium,
    color: colors.primary,
  },

  customerOptionInfo: {
    flex: 1,
  },

  customerOptionName: {
    ...typography.bodyMedium,
    color: colors.text,
  },

  customerOptionPhone: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },

  noCustomers: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  noCustomersText: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },

  loadingScreen: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
  },
});
