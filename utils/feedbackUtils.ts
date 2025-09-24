export function calculateAverages(feedback: any[]) {
  const totalReviews = feedback.length;
  const avgRating =
    feedback.reduce((sum, f) => sum + (f.NUMERIC_RESPONSE || 0), 0) /
    (totalReviews || 1);

  const neutralCount = feedback.filter((f) => f.SENTIMENT_LABEL === "neutral").length;
  const positiveCount = feedback.filter((f) => f.SENTIMENT_LABEL === "positive").length;
  const negativeCount = feedback.filter((f) => f.SENTIMENT_LABEL === "negative").length;

  const neutralPct = ((neutralCount / totalReviews) * 100).toFixed(1);
  const positivePct = ((positiveCount / totalReviews) * 100).toFixed(1);
  const negativePct = ((negativeCount / totalReviews) * 100).toFixed(1);

  return { totalReviews, avgRating, neutralPct, positivePct, negativePct };
}

export function groupByCourse(feedback: any[]) {
  const coursesGrouped = feedback.reduce((acc: any, f) => {
    const cname = f.COURSE_NAME;
    if (!acc[cname])
      acc[cname] = { course: cname, positive: 0, neutral: 0, negative: 0, total: 0 };
    acc[cname].total++;
    acc[cname][f.SENTIMENT_LABEL] = (acc[cname][f.SENTIMENT_LABEL] || 0) + 1;
    return acc;
  }, {});

  return Object.values(coursesGrouped).map((c: any) => ({
    course: c.course,
    positive: (c.positive / c.total) * 100,
    neutral: (c.neutral / c.total) * 100,
    negative: (c.negative / c.total) * 100,
  }));
}
