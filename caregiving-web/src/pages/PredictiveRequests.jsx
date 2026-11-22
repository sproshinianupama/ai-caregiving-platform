import { useState } from "react";
import CaregiverNavbar from "../components/CaregiverNavbar";
import Footer from "../components/Footer";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

function PredictiveRequests() {
  const loggedUser = JSON.parse(localStorage.getItem("loggedUser"));
  const caregiverId = loggedUser?.id;

  const [predictionData, setPredictionData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const applyPredictionResponse = (data) => {
    setSummary(data);
    setPredictionData(data.predictions || []);
  };

  const generatePrediction = async () => {
    if (!caregiverId) {
      setError("Please log in as a caregiver first.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(
        `http://localhost:5001/api/ai/predict-requests/${caregiverId}`
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "AI prediction failed");
      }

      applyPredictionResponse(data);
    } catch (err) {
      setError(err.message);
      setPredictionData([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  const getColor = (value) => {
    if (value <= 3) return "#22c55e";
    if (value <= 5) return "#facc15";
    return "#ef4444";
  };

  const chartData = predictionData.length
    ? {
        labels: predictionData.map((d) => d.date),
        datasets: [
          {
            label: "Predicted Requests",
            data: predictionData.map((d) => d.value),
            backgroundColor: predictionData.map((d) => getColor(d.value)),
          },
        ],
      }
    : null;

  const maxValue = predictionData.length
    ? Math.max(...predictionData.map((item) => item.value))
    : null;

  const minValue = predictionData.length
    ? Math.min(...predictionData.map((item) => item.value))
    : null;

  const busiestDays = predictionData.filter((item) => item.value === maxValue);
  const quietestDays = predictionData.filter((item) => item.value === minValue);
  const hasFlatPrediction = predictionData.length > 0 && maxValue === minValue;

  const formatDayList = (days) => days.map((item) => item.date).join(", ");

  return (
    <div className="min-h-screen bg-gradient-to-r from-blue-100 to-blue-100 text-[#2F2F2F] flex flex-col">
      <CaregiverNavbar />

      <div className="flex-1 p-4 sm:p-6 lg:p-10 text-center">
        <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-[#2F2F2F] via-[#1A85C6] to-[#6D9043] bg-clip-text text-transparent mb-3">
          Caregiver-specific prediction for the next 5 days
        </h1>

        <p className="text-[#2F2F2F] mb-6">
          New caregivers will not see predictions. Caregivers with 5 or more accepted/completed requests can click the button to generate the next 5-day forecast.
        </p>

        <button
          onClick={generatePrediction}
          disabled={loading}
          className="bg-gradient-to-r from-[#1A85C6] to-[#62BFE3] text-white px-6 py-2 rounded-lg shadow-md disabled:opacity-60"
        >
          {loading ? "Loading..." : "Predict Next 5 Days"}
        </button>

        {error && (
          <div className="bg-red-100 text-red-700 mt-6 max-w-2xl mx-auto rounded-xl p-4">
            {error}
          </div>
        )}

        {summary && !summary.canPredict && (
          <div className="bg-white mt-8 max-w-2xl mx-auto rounded-xl shadow-lg p-6 text-left">
            <h2 className="text-xl font-bold text-slate-800 mb-3">
              Not enough history yet
            </h2>
            <p className="text-slate-700">
              Completed requests: <strong>{summary.totalCompletedRequests}</strong>
            </p>
            <p className="text-slate-700">
              Required before prediction: <strong>{summary.minHistory}</strong>
            </p>
            <p className="text-slate-600 mt-3">
              Once this caregiver reaches at least 5 accepted/completed requests, they can click the predict button and see the next 5-day forecast.
            </p>
          </div>
        )}

        {summary?.canPredict && predictionData.length > 0 && (
          <>
            <div className="flex justify-center gap-4 sm:gap-8 mt-8 sm:mt-10 flex-wrap">
              <div className="bg-white p-4 sm:p-6 rounded-xl w-full sm:w-56 lg:w-64 shadow">
                <h3 className="font-semibold">Next 5 Days</h3>
                <p className="mt-2 text-lg font-bold">
                  Estimated: {predictionData.reduce((a, b) => a + b.value, 0).toFixed(1)}
                </p>
              </div>

              <div className="bg-white p-4 sm:p-6 rounded-xl w-full sm:w-56 lg:w-64 shadow">
                <h3 className="font-semibold">Busiest Day</h3>
                <p className="mt-2 font-bold">
                  {hasFlatPrediction ? "Balanced" : formatDayList(busiestDays)}
                </p>
              </div>

              <div className="bg-white p-4 sm:p-6 rounded-xl w-full sm:w-56 lg:w-64 shadow">
                <h3 className="font-semibold">Best Free Day</h3>
                <p className="mt-2 font-bold">
                  {hasFlatPrediction ? "Balanced" : formatDayList(quietestDays)}
                </p>
              </div>
            </div>

            <div className="bg-white p-4 sm:p-6 mt-8 sm:mt-10 rounded-xl shadow-lg max-w-4xl mx-auto overflow-x-auto">
              <Bar data={chartData} />
            </div>

            <div className="bg-white mt-8 p-6 rounded-xl shadow max-w-4xl mx-auto text-left">
              <h3 className="font-bold mb-3">AI Insight Summary</h3>

              {hasFlatPrediction ? (
                <>
                  <p>
                    Your predicted workload is fairly balanced across the next 5 days.
                  </p>
                  <p className="mt-2">
                    Recommendation: keep a steady availability plan because no single day stands out as unusually busy or free.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    Your lowest expected workload is on <strong>{formatDayList(quietestDays)}</strong>.
                  </p>

                  <p>
                    Your highest expected workload is on <strong>{formatDayList(busiestDays)}</strong>.
                  </p>

                  <p className="mt-2">
                    Recommendation: keep more time available on the busiest day to respond to likely demand.
                  </p>
                </>
              )}
            </div>
          </>
        )}
      </div>

      <Footer />
    </div>
  );
}

export default PredictiveRequests;
