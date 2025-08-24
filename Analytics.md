# **Analytics Page – Core Metrics**

## **Queue Performance**

- **Average Wait Time** (per service, per branch, per day/week).
- **Average Service Time** (duration customer spends with employee).
- **Longest Wait / Max Wait**.
- **Real-time Current Wait Time** (live average for customers right now).
- **Number of Tickets Served vs. Issued vs. No-shows** (conversion ratio).

## **Throughput & Volume**

- **Tickets Issued (daily, weekly, monthly)** by:

  - Organization
  - Branch
  - Department
  - Service

- **Tickets Completed** (per employee, per department).
- **Peak Hours / Peak Days** heatmap (queue demand over time).
- **Busiest Branch / Department** ranking.

## **Customer Behavior**

- **Drop-off Rate** (tickets abandoned before service).
- **Re-queues / Transfers** (customers moved between services).
- **Arrival Confirmation vs. No Confirmation** (if you implement arrival confirm).
- **Notification Effectiveness**: % of customers who responded after “3-away” or “It’s your turn” alert.

## **Staff / Employee Productivity**

- **Avg. Customers Served per Employee / per Hour**.
- **Avg. Handling Time by Employee** (who’s faster/slower).
- **Idle Time vs. Active Time** (per department).
- **Service SLA Breaches** (customers waiting longer than X minutes).

## **Operational Efficiency**

- **Queue Utilization**: % of available staff time actually serving customers.
- **Service Distribution**: What % of tickets are for each service type.
- **Multi-stage Tracking** (if you implement Registration → Service → Cashier): average handoff delay.

## **Customer Satisfaction** (if you add feedback)

- **Post-service ratings** (CSAT/NPS if collected).
- **Correlation of wait time vs. satisfaction**.

---

## **Analytics Page – Suggested Layout**

### **1. Overview Dashboard (Org-Level)**

- Big KPIs at the top: _Avg Wait, Avg Service Time, Tickets Today, No-show %_.
- Trend line: tickets served vs. tickets issued this week.
- Heatmap: busiest hours of the day.

### **2. Branch / Department Deep Dive**

- Filter by Branch → Department → Service.
- Compare wait/service times across departments.
- Ranking: top 5 busiest services.

### **3. Employee Performance**

- Table of employees (sortable by avg service time, tickets served).
- Highlight outliers (fastest, slowest, highest no-show rate).

### **4. Customer Flow Insights**

- Funnel chart: _Tickets Issued → Arrived → Served → Completed_.
- Notification engagement (how many came after “3-away” ping).

### **5. Trends & Forecasting**

- Time-series of wait times and volumes over weeks/months.
- Forecast next week’s peak demand (if you want ML-driven insights).

---

## **Advanced / Future Analytics**

- **Predictive Wait Times** (using past throughput + real-time staff availability).
- **What-if Simulations** (e.g., “Add 1 more employee at Branch A → wait time drops by 20%”).
- **Service SLA Dashboards** (custom targets, alerts when breached).
- **Cost Efficiency**: queue load vs. staffing cost.

---

👉 In short, the **relevant analytics** for Smart Queue boil down to:

1. _How long customers wait_
2. _How well staff handle the flow_
3. _When and where demand spikes_
4. _Where customers drop off_

---
