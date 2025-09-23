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
} from "recharts";
import Chatbot from "../component/ChatBot";

export default function Dashboard() {
  const [feedback, setFeedback] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [insights, setInsights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<any | null>(null);

  useEffect(() => {
    fetch("/api/data")
      .then((res) => res.json())
      .then((json) => {
        if (json?.feedback) setFeedback(json.feedback);
        if (json?.courses) setCourses(json.courses);
        if (json?.insights) setInsights(json.insights);
        setLoading(false);
      })
      .catch((err) => {
        console.error("❌ Error fetching data:", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>⏳ Loading dashboard...</p>
      </div>
    );
  }

  const totalReviews = feedback.length;
  const avgRating =
    feedback.reduce((sum, f) => sum + (f.NUMERIC_RESPONSE || 0), 0) /
    totalReviews;

  const neutralCount = feedback.filter(
    (f) => f.SENTIMENT_LABEL === "neutral",
  ).length;

  const positiveCount = feedback.filter(
    (f) => f.SENTIMENT_LABEL === "positive",
  ).length;
  const negativeCount = feedback.filter(
    (f) => f.SENTIMENT_LABEL === "negative",
  ).length;

  const neutralPct = ((neutralCount / totalReviews) * 100).toFixed(1);
  const positivePct = ((positiveCount / totalReviews) * 100).toFixed(1);
  const negativePct = ((negativeCount / totalReviews) * 100).toFixed(1);

  const overallNPS =
    insights.reduce((sum, i) => sum + (i.NPS || 0), 0) / insights.length;

  const urgencyFlagCount = feedback.filter(f => f.URGENCY_FLAG === true).length;

  const coursesGrouped = feedback.reduce((acc: any, f) => {
    const cname = f.COURSE_NAME;
    if (!acc[cname])
      acc[cname] = {
        course: cname,
        positive: 0,
        neutral: 0,
        negative: 0,
        total: 0,
      };
    acc[cname].total++;
    acc[cname][f.SENTIMENT_LABEL] = (acc[cname][f.SENTIMENT_LABEL] || 0) + 1;
    return acc;
  }, {});

  const chartData = Object.values(coursesGrouped).map((c: any) => ({
    course: c.course,
    positive: (c.positive / c.total) * 100,
    neutral: (c.neutral / c.total) * 100,
    negative: (c.negative / c.total) * 100,
  }));

  const selectedSummary =
    selectedCourse &&
    courses.find((c) => c.COURSE_ID === selectedCourse.COURSE_ID);

  const selectedInsights =
    selectedCourse &&
    insights.find((i) => i.COURSE_ID === selectedCourse.COURSE_ID);

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <h1>Overview of Courses</h1>
        <h2>Feedforward Data Academy</h2>
      </header>

      <div className="dashboard-grid">
        {/* LEFT PANEL */}
        <div className="left-panel">
          {/* KPI CARDS */}
          <div className="kpi-row">
            <KpiCard label="Total Reviews" value={totalReviews} />
            <KpiCard
              label="Avg Rating"
              value={`${avgRating.toFixed(1)} / 5`}
            />
            <KpiCard label="Positive %" value={`${positivePct}%`} />
            <KpiCard label="Neutral %" value={`${neutralPct}%`} />
            <KpiCard label="Negative %" value={`${negativePct}%`} />
            <KpiCard label="Net Promoter Score" value={overallNPS.toFixed(2)} />
          </div>

          {/* Chart */}
          <div className="chart-card">
            <h3>Sentiment % by Course</h3>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }} // extra bottom space
                onClick={(e) => {
                  if (e && e.activeLabel) {
                    const course = courses.find(
                      (c) => c.COURSE_NAME === e.activeLabel,
                    );
                    if (course) setSelectedCourse(course);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="course"
                  interval={0}
                  angle={-30}
                  textAnchor="end"
                  height={80} // space for tilted labels
                />
                <YAxis />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    value.toFixed(1),
                    name,
                  ]}
                />

                <Bar dataKey="positive" stackId="a" fill="#4ade80" />
                <Bar dataKey="neutral" stackId="a" fill="#60a5fa" />
                <Bar dataKey="negative" stackId="a" fill="#f87171" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Alert */}
          <div className="alert-flag">
            🚩{" "}
            <a
              href="#"
              onClick={(e) => e.preventDefault()} // prevent refresh
              className="alert-link"
            >
              There are {urgencyFlagCount} reviews that have an urgency rating. Please click
              here to review.
            </a>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="right-panel">
          <div className="chatbot-box">
            <Chatbot />
            {selectedCourse ? (
              <>
                <div className="insight-box">
                  <h4>Actionable Insights: {selectedCourse.COURSE_NAME}</h4>
                  <p className="formatted-text">
                    {selectedInsights?.OVERVIEW_ACT_INS ||
                      "No insights available."}
                  </p>
                </div>

                <div className="summary-box">
                  <h4>Summary of {selectedCourse.COURSE_NAME}</h4>
                  <p className="formatted-text">
                    {selectedSummary?.OVERVIEW_FEEDBACK ||
                      "No summary available."}
                  </p>
                </div>
              </>
            ) : (
              <p className="mt-4 text-gray-500 text-lg">
                Select a course from the chart to view insights & summary.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// KPI Card Component
function KpiCard({ label, value }: { label: string; value: any }) {
  return (
    <div className="bg-white p-3 rounded-lg shadow text-center">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}
