"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import Chatbot from "../component/ChatBot";

export default function Dashboard() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Load dashboard data
  useEffect(() => {
    fetch("/api/data")
      .then((res) => res.json())
      .then((json) => {
        if (Array.isArray(json)) {
          setData(json);
        } else if (json?.data && Array.isArray(json.data)) {
          setData(json.data);
        } else {
          console.error("Unexpected API response:", json);
          setData([]);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching data:", err);
        setData([]);
        setLoading(false);
      });
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    setSyncMessage(null);

    try {
      const res = await fetch("/api/sync-pg", { method: "GET" });
      const json = await res.json();
      setSyncMessage(json.message || "✅ Sync completed");
    } catch (err: any) {
      console.error("Sync API error:", err);
      setSyncMessage("Sync failed. Check logs.");
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
        <p>⏳ Loading dashboard...</p>
      </div>
    );
  }

  if (!Array.isArray(data) || data.length === 0) {
    return (
      <div>
        <p className="empty-msg">No feedback data available yet.</p>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 mt-4"
        >
          {syncing ? "Syncing..." : "Sync Feedback from Postgres"}
        </button>
        {syncMessage && <p className="mt-2">{syncMessage}</p>}
      </div>
    );
  }

  const responsesByCourse = Object.values(
    data.reduce((acc: any, row: any) => {
      acc[row.COURSE_NAME] = acc[row.COURSE_NAME] || {
        course: row.COURSE_NAME,
        responses: 0,
      };
      acc[row.COURSE_NAME].responses += 1;
      return acc;
    }, {})
  );

  const sentimentCounts = Object.values(
    data.reduce((acc: any, row: any) => {
      acc[row.SENTIMENT_LABEL] = acc[row.SENTIMENT_LABEL] || {
        sentiment: row.SENTIMENT_LABEL,
        count: 0,
      };
      acc[row.SENTIMENT_LABEL].count += 1;
      return acc;
    }, {})
  );

  const ratingDistribution = Object.values(
    data.reduce((acc: any, row: any) => {
      acc[row.RATING_CHOICE] = acc[row.RATING_CHOICE] || {
        rating: row.RATING_CHOICE,
        count: 0,
      };
      acc[row.RATING_CHOICE].count += 1;
      return acc;
    }, {})
  );

  const themeCounts = Object.values(
    data.reduce((acc: any, row: any) => {
      acc[row.THEMES] = acc[row.THEMES] || { theme: row.THEMES, count: 0 };
      acc[row.THEMES].count += 1;
      return acc;
    }, {})
  );

  const totalFeedback = data.length;
  const uniqueCourses = responsesByCourse.length;
  const urgentFlags = data.filter((d) => d.URGENCY_FLAG).length;

  const COLORS = ["#6366F1", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];

  return (
    <div className="dashboard-container">
      <h1 className="dashboard-title">Feedback Analytics Dashboard</h1>

      {/*<div className="mb-6">
        <button onClick={handleSync} disabled={syncing} className="sync-btn">
          {syncing ? "⏳ Syncing..." : "🔄 Sync Feedback from Postgres"}
        </button>
        {syncMessage && <p className="sync-message">{syncMessage}</p>}
      </div>*/}

      <div className="dashboard-grid">
        {/* Row 1: Responses */}
        <div className="row-full">
          <div className="card">
            <h3>Responses by Course</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={responsesByCourse}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="course" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="responses" fill="#6366F1" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Row 2: Ratings */}
        <div className="row-full">
          <div className="card">
            <h3>Rating Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={ratingDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="rating" />
                <YAxis />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#6366F1"
                  fill="#C7D2FE"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Row 3: Sentiment + Theme */}
        <div className="row-half">
          <div className="card">
            <h3>Sentiment Distribution</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={sentimentCounts as any}
                  dataKey="count"
                  nameKey="sentiment"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {sentimentCounts.map((_: any, i: number) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <h3>Theme Distribution</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={themeCounts as any}
                  dataKey="count"
                  nameKey="theme"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {themeCounts.map((_: any, i: number) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Row 4: KPI cards */}
        <div className="row-half">
          <div className="kpi card">
            <h3>Total Feedback</h3>
            <p className="kpi-value">{totalFeedback}</p>
            <p className="kpi-trend up">↑ +5% vs last week</p>
          </div>
          <div className="kpi card">
            <h3>Courses</h3>
            <p className="kpi-value">{uniqueCourses}</p>
            <p className="kpi-trend up">↑ +2 vs last week</p>
          </div>
          <div className="kpi card">
            <h3>Urgent Flags</h3>
            <p className="kpi-value">{urgentFlags}</p>
            <p className="kpi-trend down">↓ -1 vs last week</p>
          </div>
        </div>

        {/* Row 5: Suggestions */}
        <div className="row-full">
          <div className="card">
            <h3>💡 Actionable Suggestions</h3>
            <ul className="suggestions">
              {data.slice(0, 5).map((item, idx) => (
                <li key={idx}>
                  <p className="suggestion-course">{item.COURSE_NAME}</p>
                  <p>{item.ACTIONABLE_SUGGESTION}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <Chatbot />

      <div className="card" style={{ marginTop: "2rem" }}>
        <h3>🐞 Debug: Raw API Data</h3>
        <pre
          style={{
            maxHeight: "200px",
            overflow: "auto",
            fontSize: "0.8rem",
            background: "#f3f4f6",
            padding: "1rem",
          }}
        >
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    </div>
  );
}
