# 🚀 Voyx Sales Dashboard

A dynamic and interactive Sales Dashboard built using HTML, CSS, JavaScript, and Supabase to monitor and analyze sales performance.

The dashboard is date-driven, allowing users to select a reporting date and view the corresponding KPIs, sales representative performance, top destinations, and sales trends.

## 📊 Features

- 📅 Dynamic date selection
- 📈 Daily and Month-to-Date (MTD) KPIs
- 💰 Revenue tracking
- 🏆 Daily sales representative leaderboard
- 🎯 Target achievement tracking
- 🌍 Top destination analysis
- 📉 Daily sales trend visualization
- 📊 Monthly sales trend visualization
- 📥 CSV data export
- 🌓 Dark/Light mode
- 📱 Responsive dashboard interface

## 🛠️ Tech Stack

- HTML5
- CSS3
- JavaScript
- Supabase
- PostgreSQL
- Supabase RPC Functions

## 📁 Project Structure

sales-dashboard/
│
├── index.html
├── app.js
├── style.css
└── README.md

## ⚙️ How It Works

The dashboard is driven by the selected reporting date.

User selects a date
        ↓
Dashboard sends the selected date to Supabase
        ↓
Supabase retrieves the corresponding sales data
        ↓
Dashboard processes the response
        ↓
KPIs, tables, destinations and charts update dynamically

This ensures that the dashboard displays data based on the selected date instead of showing static information.

## 📌 Dashboard Sections

### KPI Metrics

The dashboard displays important sales metrics such as:

- Daily Orders
- Daily Revenue
- Month-to-Date Orders
- Month-to-Date Revenue
- Previous Month Performance
- Previous Month Revenue

### Sales Representative Leaderboard

The leaderboard provides a performance comparison of sales representatives using metrics such as:

- Daily Orders
- MTD Orders
- MTD Revenue
- ARPU
- Target Achievement
- Monthly Performance

### Top Destinations

The dashboard displays the highest-performing destinations based on the selected reporting date.

### Sales Trends

The dashboard provides visual analysis of:

- Daily sales performance
- Monthly sales performance


## 🎯 Project Objective

The objective of this project is to provide an interactive sales analytics dashboard that allows users to quickly understand sales performance across different dates.

The dashboard helps users analyze:

- Sales volume
- Revenue
- Sales representative performance
- Target achievement
- Destination performance
- Daily trends
- Monthly trends

## 👩‍💻 Author

Divyanshi Gupta

B.Tech Computer Science Engineering
AI/ML Specialization

## 📄 License

This project is created for educational and demonstration purposes.