import type { ReceiptData } from "@/models/receipt";

const PAPER_WIDTHS = {
  "58mm": 32,
  "80mm": 48,
} as const;

type ReceiptPaperWidth = keyof typeof PAPER_WIDTHS;

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

function centerText(text: string, width: number): string {
  if (text.length >= width) {
    return text.slice(0, width);
  }

  const totalPadding = width - text.length;
  const leftPadding = Math.floor(totalPadding / 2);

  return (
    " ".repeat(leftPadding) + text + " ".repeat(totalPadding - leftPadding)
  );
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

function createSeparator(width: number): string {
  return "-".repeat(width);
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

  return `${label}${" ".repeat(spaces)}${amountText}`;
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

  return `${description}${" ".repeat(spaces)}${amountText}`;
}

function appendWrappedText(lines: string[], text: string, width: number): void {
  const wrappedLines = wrapText(text, width);

  for (const line of wrappedLines) {
    lines.push(line);
  }
}

export function formatReceipt(
  receipt: ReceiptData,
  paperWidth: ReceiptPaperWidth,
): string {
  const width = PAPER_WIDTHS[paperWidth];
  const separator = createSeparator(width);
  const lines: string[] = [];

  lines.push(centerText(receipt.shop.name, width));

  if (receipt.shop.address) {
    appendWrappedText(lines, receipt.shop.address, width);
  }

  if (receipt.shop.contact) {
    appendWrappedText(lines, receipt.shop.contact, width);
  }

  lines.push("");
  lines.push(centerText("ACKNOWLEDGEMENT RECEIPT", width));
  lines.push("");

  lines.push(
    createLabelValueLine("JO", receipt.transaction.jobOrderNumber, width),
  );

  lines.push(
    createLabelValueLine("Date", formatDate(receipt.transaction.date), width),
  );

  lines.push(
    createLabelValueLine("Customer", receipt.transaction.customerName, width),
  );

  lines.push(
    createLabelValueLine("Staff", receipt.transaction.staffName, width),
  );

  if (receipt.transaction.status === "Voided") {
    lines.push(createLabelValueLine("Status", "Voided", width));
  }

  lines.push("");
  lines.push(separator);

  for (const item of receipt.items) {
    appendWrappedText(lines, item.name, width);

    lines.push(
      createItemAmountLine(
        item.quantity,
        item.unitPrice,
        item.lineTotal,
        width,
      ),
    );
  }

  lines.push(separator);

  lines.push(createAmountLine("Subtotal", receipt.totals.subtotal, width));

  if (receipt.totals.discount > 0) {
    lines.push(createAmountLine("Discount", receipt.totals.discount, width));
  }

  lines.push(separator);

  lines.push(createAmountLine("TOTAL", receipt.totals.total, width));

  if (receipt.payments.length > 0) {
    lines.push("");
    lines.push("PAYMENT HISTORY");

    for (const payment of receipt.payments) {
      lines.push(createAmountLine(payment.method, payment.amount, width));

      if (payment.method === "Cash" && payment.cashReceived !== null) {
        lines.push(
          createAmountLine("Cash Received", payment.cashReceived, width),
        );
      }

      if (payment.method === "Cash" && payment.change !== null) {
        lines.push(createAmountLine("Change", payment.change, width));
      }

      if (payment.reference) {
        appendWrappedText(lines, `Reference: ${payment.reference}`, width);
      }
    }
  }

  const amountPaid = receipt.totals.total - receipt.balance;

  lines.push("");
  lines.push(createAmountLine("Amount Paid", amountPaid, width));

  lines.push(createAmountLine("Balance", receipt.balance, width));

  lines.push("");
  lines.push(separator);
  lines.push("");

  const footerLines = wrapText(receipt.footerMessage, width);

  for (const line of footerLines) {
    lines.push(centerText(line, width));
  }

  lines.push("");
  lines.push(centerText("THANK YOU!", width));
  lines.push("");

  return lines.join("\n");
}
