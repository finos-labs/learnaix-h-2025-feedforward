"use client";

import { useEffect, useState } from "react";
import Chatbot from "../component/ChatBot";
import KpiCard from "../component/KpiCard";
import SentimentChart from "../component/SentimentChart";
import { calculateAverages, groupByCourse } from "@/utils/feedbackUtils";
import { DASHBOARD_LABELS } from "@/constants/dashboard";

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
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>⏳ Loading dashboard...</p>
      </div>
    );
  }

  const { totalReviews, avgRating, neutralPct, positivePct, negativePct } =
    calculateAverages(feedback);

  const overallNPS =
    insights.reduce((sum, i) => sum + (i.NPS || 0), 0) / (insights.length || 1);

  const urgencyFlagCount = feedback.filter((f) => f.URGENCY_FLAG === true).length;
  const chartData = groupByCourse(feedback);

  const selectedSummary =
    selectedCourse && courses.find((c) => c.COURSE_ID === selectedCourse.COURSE_ID);

  const selectedInsights =
    selectedCourse && insights.find((i) => i.COURSE_ID === selectedCourse.COURSE_ID);

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Overview of Courses</h1>
        <h2>Feedforward Data Academy</h2>
      </header>

      <div className="dashboard-grid">
        {/* LEFT PANEL */}
        <div className="left-panel">
          <div className="kpi-row">
            <KpiCard label={DASHBOARD_LABELS.TOTAL_REVIEWS} value={totalReviews} />
            <KpiCard label={DASHBOARD_LABELS.AVG_RATING} value={`${avgRating.toFixed(1)} / 5`} />
            <KpiCard label={DASHBOARD_LABELS.POSITIVE} value={`${positivePct}%`} />
            <KpiCard label={DASHBOARD_LABELS.NEUTRAL} value={`${neutralPct}%`} />
            <KpiCard label={DASHBOARD_LABELS.NEGATIVE} value={`${negativePct}%`} />
            <KpiCard label={DASHBOARD_LABELS.NPS} value={overallNPS.toFixed(2)} />
          </div>

          <div className="chart-card">
            <h3>Sentiment % by Course</h3>
            <SentimentChart
              data={chartData}
              courses={courses}
              onCourseSelect={setSelectedCourse}
            />
          </div>

          <div className="alert-flag">
            {DASHBOARD_LABELS.ALERT.replace("{count}", urgencyFlagCount.toString())}
          </div>
        </div>

        <div className="right-panel">
          <div className="chatbot-box">
            <Chatbot />
            {selectedCourse ? (
              <>
                <div className="insight-box">
                  <h4>Actionable Insights: {selectedCourse.COURSE_NAME}</h4>
                  <p className="formatted-text">
                    {selectedInsights?.OVERVIEW_ACT_INS || "No insights available."}
                  </p>
                </div>

                <div className="summary-box">
                  <h4>Summary of {selectedCourse.COURSE_NAME}</h4>
                  <p className="formatted-text">
                    {selectedSummary?.OVERVIEW_FEEDBACK || "No summary available."}
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
