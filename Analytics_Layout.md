# 📊 **Smart Queue – Analytics Page Layout**

---

## **1. Page Header**

- **Title**: _Analytics & Insights_
- **Filters (global, sticky at top):**

  - Date Range (Today / This Week / Custom)
  - Org → Branch → Department → Service (cascading dropdowns)
  - Employee (optional)

---

## **2. KPI Cards (Quick Stats)**

Four big tiles across the top (real-time + aggregated):

- **Avg. Wait Time** (XX min)
- **Avg. Service Time** (XX min)
- **Tickets Issued vs. Served** (ratio + %)
- **No-show Rate** (%)

(Optional: trend arrow ⬆️/⬇️ vs. last week)

---

## **3. Queue Performance Section**

**Charts:**

- **Line Chart** → _Wait Time Trend_ (x-axis: time/day, y-axis: avg wait in minutes).
- **Heatmap** → _Peak Hours_ (days vs. hours, intensity = ticket volume).

---

## **4. Volume & Throughput Section**

**Charts:**

- **Bar Chart** → _Tickets Issued vs. Served vs. No-show_ (by branch or department).
- **Pie Chart** → _Service Distribution_ (% of tickets per service).

---

## **5. Employee Productivity Section**

**Table (sortable):**

| Employee | Tickets Served | Avg Service Time | Customers/Hour | No-show % | SLA Breach % |
| -------- | -------------- | ---------------- | -------------- | --------- | ------------ |

**Chart:**

- Horizontal bar ranking employees by _Tickets Served_.

---

## **6. Customer Flow Insights**

**Funnel Visualization:**

- Tickets Issued → Arrived → Served → Completed
- Each step shows count + % drop-off.

**Notification Effectiveness Table:**

| Trigger       | Sent | Engaged (%) | Avg Response Time |
| ------------- | ---- | ----------- | ----------------- |
| 3-away notice | 200  | 65%         | 3.2 min           |
| Turn notice   | 180  | 92%         | 0.8 min           |

---

## **7. Trends & Forecasting**

**Charts:**

- **Time-series forecast**: Predicted ticket volume next week (line with shaded confidence).
- **What-if Simulation Widget** (future): “+1 staff → wait drops to X min”.

---

## **8. Export & Sharing**

- Buttons: **Download CSV**, **Export PDF Report**, **Email Report to Manager**.

---

## 🎨 **Wireframe Flow (Top → Bottom)**

```markdown
---

## Header: Analytics & Insights [Date Filter] [Branch ▼]

## [ KPI Tiles: Avg Wait | Avg Service | Tickets | No-shows ]

Queue Performance:
[Line Chart: Wait Trend] [Heatmap: Peak Hours]

---

Volume & Throughput:
[Bar Chart: Tickets by Dept] [Pie Chart: Service Mix]

---

Employee Productivity:
[Ranking Table] [Bar Chart: Tickets Served/Employee]

---

Customer Flow Insights:
[Funnel Chart] [Notification Effectiveness Table]

---

Trends & Forecasting:
[Forecast Line Chart] [What-if Simulation Placeholder]

---

## Export: [CSV] [PDF] [Email Report]
```

---

🔥 This layout gives you **exec-level KPIs up top, operational detail in the middle, forecasting at the bottom.**
It’s modular: you can roll out _KPIs + Queue Performance first_, then layer in _Employee/Productivity_, then _Forecasting_ later.

---

Do you want me to now **map these widgets to Supabase queries** (e.g., SQL for avg wait time, tickets per dept, no-show rate), so you can wire it directly into the frontend?
