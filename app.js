const DATA_URL = "./data/current-cycle.json";
const HISTORY_URL = "./data/previous-cycles.json";
const COLORS = ["#1d5c46", "#d46d4c", "#d9a441", "#5f7f96", "#8a7596", "#719b82"];

const money = new Intl.NumberFormat("en-AE", {
  style: "currency",
  currency: "AED",
  minimumFractionDigits: 2,
});

const compactMoney = new Intl.NumberFormat("en-AE", {
  style: "currency",
  currency: "AED",
  notation: "compact",
  maximumFractionDigits: 1,
});

const dateLong = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Dubai",
});

const dateShort = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: "Asia/Dubai",
});

function byId(id) {
  return document.getElementById(id);
}

function parseDate(value) {
  return new Date(`${value}T12:00:00+04:00`);
}

function formatDate(value) {
  return dateLong.format(parseDate(value));
}

function cleanMerchant(value) {
  return value
    .replace(/\s+(AE|IE|FR)$/i, "")
    .replace(/\s+(Dubai|Abu Dhabi)$/i, "")
    .trim();
}

function categoryTotals(transactions) {
  return [...transactions.reduce((totals, item) => {
    const key = item.category || "Uncategorized";
    totals.set(key, (totals.get(key) || 0) + item.amount);
    return totals;
  }, new Map())]
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);
}

function dailyTotals(transactions) {
  return [...transactions.reduce((totals, item) => {
    totals.set(item.date, (totals.get(item.date) || 0) + item.amount);
    return totals;
  }, new Map())]
    .map(([date, amount]) => ({ date, amount }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function merchantTotals(transactions) {
  return [...transactions.reduce((totals, item) => {
    const key = cleanMerchant(item.merchant);
    totals.set(key, (totals.get(key) || 0) + item.amount);
    return totals;
  }, new Map())]
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);
}

function renderSummary(data, daily) {
  const total = data.transactions.reduce((sum, item) => sum + item.amount, 0);
  const latest = daily.at(-1) || { date: data.cycle.start, amount: 0 };
  const elapsed = Math.max(1, daily.length);
  const cycleStart = formatDate(data.cycle.start);
  const cycleEnd = formatDate(data.cycle.end);

  byId("cycle-label").textContent = `${cycleStart} – ${cycleEnd}`;
  byId("updated-label").textContent = `Updated ${formatDate(data.updatedAt.slice(0, 10))}`;
  byId("cycle-total").textContent = money.format(total);
  byId("cycle-progress").textContent = `Since ${cycleStart}`;
  byId("latest-total").textContent = money.format(latest.amount);
  byId("latest-date").textContent = formatDate(latest.date);
  byId("transaction-count").textContent = data.transactions.length.toLocaleString("en");
  byId("daily-average").textContent = `${money.format(total / elapsed)} per active day`;
  byId("review-count").textContent = data.reviewItems.length.toLocaleString("en");
  byId("donut-total").textContent = compactMoney.format(total);
}

function renderDonut(categories) {
  const svg = byId("category-donut");
  const legend = byId("category-legend");
  const total = categories.reduce((sum, item) => sum + item.amount, 0);
  const radius = 72;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  const background = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  background.setAttribute("cx", "100");
  background.setAttribute("cy", "100");
  background.setAttribute("r", radius);
  background.setAttribute("class", "donut-segment");
  background.setAttribute("stroke", "#e4e3dc");
  svg.appendChild(background);

  categories.forEach((item, index) => {
    const ratio = total ? item.amount / total : 0;
    const segment = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    segment.setAttribute("cx", "100");
    segment.setAttribute("cy", "100");
    segment.setAttribute("r", radius);
    segment.setAttribute("class", "donut-segment");
    segment.setAttribute("stroke", COLORS[index % COLORS.length]);
    segment.setAttribute("stroke-dasharray", `${ratio * circumference} ${circumference}`);
    segment.setAttribute("stroke-dashoffset", `${-offset * circumference}`);
    svg.appendChild(segment);
    offset += ratio;

    const row = document.createElement("div");
    row.className = "legend-row";
    row.innerHTML = `
      <span class="legend-dot" style="background:${COLORS[index % COLORS.length]}"></span>
      <span>${item.name}</span>
      <strong>${money.format(item.amount)}</strong>
    `;
    legend.appendChild(row);
  });

  if (categories[0]) {
    const share = total ? Math.round((categories[0].amount / total) * 100) : 0;
    byId("top-category-note").textContent = `${categories[0].name} · ${share}% of spend`;
  }
}

function renderDailyChart(daily) {
  const holder = byId("daily-chart");
  const width = 520;
  const height = 238;
  const pad = { left: 24, right: 18, top: 24, bottom: 34 };
  const plotWidth = width - pad.left - pad.right;
  const plotHeight = height - pad.top - pad.bottom;
  const max = Math.max(...daily.map((item) => item.amount), 1);
  const points = daily.map((item, index) => {
    const x = daily.length === 1
      ? pad.left + plotWidth / 2
      : pad.left + (index / (daily.length - 1)) * plotWidth;
    const y = pad.top + plotHeight - (item.amount / max) * plotHeight;
    return { ...item, x, y };
  });

  const linePath = points.map((point, index) =>
    `${index ? "L" : "M"} ${point.x} ${point.y}`).join(" ");
  const areaPath = points.length
    ? `${linePath} L ${points.at(-1).x} ${pad.top + plotHeight} L ${points[0].x} ${pad.top + plotHeight} Z`
    : "";

  const gridLines = [0, 0.5, 1].map((ratio) => {
    const y = pad.top + plotHeight - ratio * plotHeight;
    return `<line class="chart-grid" x1="${pad.left}" y1="${y}" x2="${width - pad.right}" y2="${y}" />`;
  }).join("");

  const dots = points.map((point) => `
    <circle class="chart-dot" cx="${point.x}" cy="${point.y}" r="5">
      <title>${formatDate(point.date)}: ${money.format(point.amount)}</title>
    </circle>
    <text class="chart-label" x="${point.x}" y="${height - 10}" text-anchor="middle">${dateShort.format(parseDate(point.date))}</text>
  `).join("");

  holder.setAttribute(
    "aria-label",
    daily.length
      ? `Daily spending chart. Latest value ${money.format(daily.at(-1).amount)} on ${formatDate(daily.at(-1).date)}.`
      : "No daily spending yet.",
  );
  holder.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
      <defs>
        <linearGradient id="daily-gradient" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="#d46d4c" stop-opacity=".25" />
          <stop offset="100%" stop-color="#d46d4c" stop-opacity="0" />
        </linearGradient>
      </defs>
      ${gridLines}
      <path class="chart-area" d="${areaPath}" />
      <path class="chart-line" d="${linePath}" />
      ${dots}
    </svg>
  `;

  if (daily.length) {
    const peak = [...daily].sort((a, b) => b.amount - a.amount)[0];
    byId("peak-day-note").textContent = `Peak ${money.format(peak.amount)} · ${dateShort.format(parseDate(peak.date))}`;
  }
}

function renderMerchants(merchants) {
  const holder = byId("merchant-bars");
  const top = merchants.slice(0, 5);
  const max = top[0]?.amount || 1;

  top.forEach((item) => {
    const row = document.createElement("div");
    row.className = "merchant-row";
    row.innerHTML = `
      <span class="merchant-name" title="${item.name}">${item.name}</span>
      <span class="merchant-value">${money.format(item.amount)}</span>
      <div class="merchant-track" aria-hidden="true">
        <div class="merchant-fill" style="width:${(item.amount / max) * 100}%"></div>
      </div>
    `;
    holder.appendChild(row);
  });
}

function renderReviews(items) {
  const holder = byId("review-list");

  if (!items.length) {
    holder.innerHTML = '<div class="empty-state">Nothing needs review right now.</div>';
    return;
  }

  items.forEach((item) => {
    const element = document.createElement("div");
    element.className = "review-item";
    element.innerHTML = `
      <strong>${cleanMerchant(item.merchant)}</strong>
      <strong class="review-amount">${money.format(item.amount)}</strong>
      <p>${item.reason}</p>
    `;
    holder.appendChild(element);
  });
}

function renderTransactions(transactions) {
  const holder = byId("transaction-rows");
  [...transactions]
    .sort((a, b) => b.date.localeCompare(a.date) || b.amount - a.amount)
    .slice(0, 12)
    .forEach((item) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${dateShort.format(parseDate(item.date))}</td>
        <td>${cleanMerchant(item.merchant)}</td>
        <td><span class="category-pill">${item.category || "Uncategorized"}</span></td>
        <td class="amount">${money.format(item.amount)}</td>
      `;
      holder.appendChild(row);
    });
}

function renderHistory(history) {
  const previous = history.cycles[0];
  if (!previous) return;

  byId("previous-cycle-label").textContent =
    `${formatDate(previous.start)} – ${formatDate(previous.end)}`;
  byId("previous-cycle-total").textContent = money.format(previous.total);
  byId("previous-cycle-meta").textContent =
    `${previous.transactionCount} transactions · archived`;
}

async function init() {
  try {
    const [dataResponse, historyResponse] = await Promise.all([
      fetch(DATA_URL, { cache: "no-store" }),
      fetch(HISTORY_URL, { cache: "no-store" }),
    ]);

    if (!dataResponse.ok || !historyResponse.ok) {
      throw new Error("Dashboard data unavailable");
    }

    const [data, history] = await Promise.all([
      dataResponse.json(),
      historyResponse.json(),
    ]);

    const categories = categoryTotals(data.transactions);
    const daily = dailyTotals(data.transactions);
    const merchants = merchantTotals(data.transactions);

    renderSummary(data, daily);
    renderDonut(categories);
    renderDailyChart(daily);
    renderMerchants(merchants);
    renderReviews(data.reviewItems);
    renderTransactions(data.transactions);
    renderHistory(history);
  } catch (error) {
    byId("dashboard").hidden = true;
    byId("error-state").hidden = false;
    console.error(error);
  }
}

init();
