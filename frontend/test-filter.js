const events = [
  { title: "Test", severity: "MODERATE", industry: "Software", publishedAt: "2024-03-18T10:00:00Z" }
];
const selectedIndustries = [];
const selectedSeverities = ["HIGH"];
const timeframe = "All Time";

const filteredData = events.filter(item => {
  const industryMatch = selectedIndustries.length === 0 || selectedIndustries.includes(item.industry);
  const severityMatch = selectedSeverities.length === 0 || selectedSeverities.includes(item.severity);
  let timeMatch = true;
  if (timeframe !== "All Time") {
    // ...
  }
  return industryMatch && severityMatch && timeMatch;
});

console.log("Filtered Length:", filteredData.length);
