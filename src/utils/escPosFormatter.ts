import type { ReceiptData } from "@/models/receipt";

const PAPER_WIDTHS = {
  "58mm": 32,
  "80mm": 48,
} as const;

type ReceiptPaperWidth = keyof typeof PAPER_WIDTHS;

const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

const COMMANDS = {
  initialize: [ESC, 0x40],

  alignLeft: [ESC, 0x61, 0x00],
  alignCenter: [ESC, 0x61, 0x01],
  alignRight: [ESC, 0x61, 0x02],

  boldOn: [ESC, 0x45, 0x01],
  boldOff: [ESC, 0x45, 0x00],

  feedLines: (lines: number) => [ESC, 0x64, lines],

  cut: [GS, 0x56, 0x00],
} as const;

function encodeText(text: string): number[] {
  const bytes: number[] = [];

  for (const char of text) {
    const codePoint = char.codePointAt(0);

    if (codePoint === undefined) {
      continue;
    }

    /*
     * ESC/POS printers commonly expect CP437 or another
     * single-byte code page. For now we keep the formatter
     * limited to printable ASCII so the printer layer remains
     * predictable across generic thermal printers.
     */
    if (codePoint <= 0x7f) {
      bytes.push(codePoint);
    } else {
      bytes.push(0x3f);
    }
  }

  return bytes;
}

function addBytes(target: number[], bytes: readonly number[]): void {
  target.push(...bytes);
}

function addText(target: number[], text: string): void {
  target.push(...encodeText(text));
}

function addLine(target: number[], text = ""): void {
  addText(target, text);
  target.push(LF);
}

function centerText(text: string, width: number): string {
  if (text.length >= width) {
    return text.slice(0, width);
  }

  const padding = width - text.length;
  const leftPadding = Math.floor(padding / 2);

  return " ".repeat(leftPadding) + text + " ".repeat(padding - leftPadding);
}

function wrapText(text: string, width: number): string[] {
  if (!text) {
    return [""];
  }

  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if (!currentLine) {
      if (word.length <= width) {
        currentLine = word;
      } else {
        for (let index = 0; index < word.length; index += width) {
          lines.push(word.slice(index, index + width));
        }
      }

      continue;
    }

    const candidate = `${currentLine} ${word}`;

    if (candidate.length <= width) {
      currentLine = candidate;
      continue;
    }

    lines.push(currentLine);

    if (word.length <= width) {
      currentLine = word;
    } else {
      for (let index = 0; index < word.length; index += width) {
        const chunk = word.slice(index, index + width);

        if (chunk.length === width) {
          lines.push(chunk);
        } else {
          currentLine = chunk;
        }
      }
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

function formatAmount(amount: number): string {
  return amount.toFixed(2);
}

function formatDate(date: string): string {
  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return date;
  }

  return parsedDate.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function createSeparator(width: number): string {
  return "-".repeat(width);
}

function createAmountLine(
  label: string,
  amount: number,
  width: number,
): string {
  const amountText = formatAmount(amount);

  if (label.length + amountText.length + 1 >= width) {
    return `${label} ${amountText}`;
  }

  const spaces = width - label.length - amountText.length;

  return label + " ".repeat(spaces) + amountText;
}

function createLabelValueLine(
  label: string,
  value: string,
  width: number,
): string {
  const fullValue = `${label}: ${value}`;

  if (fullValue.length <= width) {
    return fullValue;
  }

  const availableValueLength = Math.max(1, width - label.length - 2);

  return `${label}: ${value.slice(0, availableValueLength)}`;
}

function createItemAmountLine(
  quantity: number,
  unitPrice: number,
  lineTotal: number,
  width: number,
): string {
  const description = `${quantity} x ${formatAmount(unitPrice)}`;

  const amountText = formatAmount(lineTotal);

  if (description.length + amountText.length + 1 >= width) {
    return `${description} ${amountText}`;
  }

  const spaces = width - description.length - amountText.length;

  return description + " ".repeat(spaces) + amountText;
}

function addWrappedLines(
  target: number[],
  text: string,
  width: number,
  centered = false,
): void {
  const lines = wrapText(text, width);

  for (const line of lines) {
    addLine(target, centered ? centerText(line, width) : line);
  }
}

export function formatReceiptToEscPos(
  receipt: ReceiptData,
  paperWidth: ReceiptPaperWidth,
): Uint8Array {
  const width = PAPER_WIDTHS[paperWidth];
  const bytes: number[] = [];

  /*
   * Initialize printer.
   */
  addBytes(bytes, COMMANDS.initialize);

  /*
   * Shop header.
   */
  addBytes(bytes, COMMANDS.alignCenter);

  addBytes(bytes, COMMANDS.boldOn);

  addLine(bytes, centerText(receipt.shop.name, width));

  addBytes(bytes, COMMANDS.boldOff);

  if (receipt.shop.address) {
    addWrappedLines(bytes, receipt.shop.address, width, true);
  }

  if (receipt.shop.contact) {
    addWrappedLines(bytes, receipt.shop.contact, width, true);
  }

  addLine(bytes);

  /*
   * Receipt title.
   */
  addBytes(bytes, COMMANDS.boldOn);

  addLine(bytes, centerText("ACKNOWLEDGEMENT RECEIPT", width));

  addBytes(bytes, COMMANDS.boldOff);

  addLine(bytes);

  /*
   * Transaction details.
   */
  addBytes(bytes, COMMANDS.alignLeft);

  addLine(
    bytes,
    createLabelValueLine("JO", receipt.transaction.jobOrderNumber, width),
  );

  addLine(
    bytes,
    createLabelValueLine("Date", formatDate(receipt.transaction.date), width),
  );

  addLine(
    bytes,
    createLabelValueLine("Customer", receipt.transaction.customerName, width),
  );

  addLine(
    bytes,
    createLabelValueLine("Staff", receipt.transaction.staffName, width),
  );

  if (receipt.transaction.status === "Voided") {
    addLine(bytes, createLabelValueLine("Status", "Voided", width));
  }

  addLine(bytes);

  addLine(bytes, createSeparator(width));

  /*
   * Items.
   */
  for (const item of receipt.items) {
    addWrappedLines(bytes, item.name, width, false);

    addLine(
      bytes,
      createItemAmountLine(
        item.quantity,
        item.unitPrice,
        item.lineTotal,
        width,
      ),
    );
  }

  addLine(bytes, createSeparator(width));

  /*
   * Totals.
   */
  addLine(bytes, createAmountLine("Subtotal", receipt.totals.subtotal, width));

  if (receipt.totals.discount > 0) {
    addLine(
      bytes,
      createAmountLine("Discount", receipt.totals.discount, width),
    );
  }

  addLine(bytes, createSeparator(width));

  addBytes(bytes, COMMANDS.boldOn);

  addLine(bytes, createAmountLine("TOTAL", receipt.totals.total, width));

  addBytes(bytes, COMMANDS.boldOff);

  /*
   * Payment history.
   */
  if (receipt.payments.length > 0) {
    addLine(bytes);

    addBytes(bytes, COMMANDS.boldOn);

    addLine(bytes, "PAYMENT HISTORY");

    addBytes(bytes, COMMANDS.boldOff);

    for (const payment of receipt.payments) {
      addLine(bytes, createAmountLine(payment.method, payment.amount, width));

      if (payment.method === "Cash" && payment.cashReceived !== null) {
        addLine(
          bytes,
          createAmountLine("Cash Received", payment.cashReceived, width),
        );
      }

      if (payment.method === "Cash" && payment.change !== null) {
        addLine(bytes, createAmountLine("Change", payment.change, width));
      }

      if (payment.reference) {
        addWrappedLines(bytes, `Reference: ${payment.reference}`, width, false);
      }
    }
  }

  /*
   * Balance.
   */
  const amountPaid = receipt.totals.total - receipt.balance;

  addLine(bytes);

  addLine(bytes, createAmountLine("Amount Paid", amountPaid, width));

  addLine(bytes, createAmountLine("Balance", receipt.balance, width));

  addLine(bytes);

  addLine(bytes, createSeparator(width));

  addLine(bytes);

  /*
   * Footer message.
   */
  addBytes(bytes, COMMANDS.alignCenter);

  addWrappedLines(bytes, receipt.footerMessage, width, true);

  addLine(bytes);

  addBytes(bytes, COMMANDS.boldOn);

  addLine(bytes, centerText("THANK YOU!", width));

  addBytes(bytes, COMMANDS.boldOff);

  /*
   * Feed paper before the eventual cut command.
   *
   * We deliberately keep the cut command out for now.
   * Some generic 58mm printers do not have an auto cutter,
   * and the PB-58's actual behavior still needs to be tested.
   */
  addBytes(bytes, COMMANDS.feedLines(3));

  return new Uint8Array(bytes);
}
