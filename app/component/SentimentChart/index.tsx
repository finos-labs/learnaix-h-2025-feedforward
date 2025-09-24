"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { CHART_COLORS } from "@/constants/dashboard";

export default function SentimentChart({
  data,
  courses,
  onCourseSelect,
}: {
  data: any[];
  courses: any[];
  onCourseSelect: (course: any) => void;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
        onClick={(e) => {
          if (e && e.activeLabel) {
            const course = courses.find((c) => c.COURSE_NAME === e.activeLabel);
            if (course) onCourseSelect(course);
          }
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="course" interval={0} angle={-30} textAnchor="end" height={80} />
        <YAxis />
        <Tooltip formatter={(value: number, name: string) => [value.toFixed(1), name]} />

        <Bar dataKey="positive" stackId="a" fill={CHART_COLORS.POSITIVE} />
        <Bar dataKey="neutral" stackId="a" fill={CHART_COLORS.NEUTRAL} />
        <Bar dataKey="negative" stackId="a" fill={CHART_COLORS.NEGATIVE} />
      </BarChart>
    </ResponsiveContainer>
  );
}
