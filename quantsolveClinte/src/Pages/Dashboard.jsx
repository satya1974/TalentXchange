import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Navbar from "../Components/Navbar";

const Dashboard = () => {
  const location = useLocation();
  const data = location.state || {};

  const [activeTab, setActiveTab] = useState("tokens");
  const [mode, setMode] = useState("user");

  const solutions = data?.solutions || [];

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [data]);

  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentSolutions = solutions.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(solutions.length / itemsPerPage);
  console.log("Received data:", data);

  return (
    <div className="bg-[#0B0F19] text-[#F9FAFB] min-h-screen">
      <Navbar />

      <div className="max-w-7xl mx-auto p-6 space-y-8">

        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">
            Solver Dashboard
          </h1>

          {/* MODE TOGGLE */}
          <div className="flex bg-[#1F2937] rounded-full p-1 border border-[#374151] shadow-inner">
            {["user", "dev"].map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-4 py-1 text-sm rounded-full transition cursor-pointer ${
                  mode === m
                    ? "bg-[#F59E0B] text-black shadow"
                    : "text-[#9CA3AF]"
                }`}
              >
                {m === "user" ? "User" : "Dev"}
              </button>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-6 text-center">
          <Card title="Equation" value={data.input || "-"} />
          <Card title="Variables" value={data?.meta?.variableCount || 0} />
          <Card title="Solutions" value={data.solutionCount || 0} />
          {/* <Card title="Status" value={data.success ? "Success" : "Failed"} /> */}
          <Card title="Status" value={data.success.toString()} />
        </div>

        <div className="grid md:grid-cols-2 gap-6">

          {/* TABLE */}
          <div className="bg-[#1F2937]/80 backdrop-blur p-5 rounded-2xl border border-[#374151] shadow-lg">
            <h2 className="text-lg font-semibold text-[#F59E0B] mb-4">
              Solutions
            </h2>

            <div className="max-h-[420px] overflow-auto rounded-lg">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-[#111827]">
                  <tr className="text-[#9CA3AF]">
                    {solutions[0] &&
                      Object.keys(solutions[0]).sort().map((key) => (
                        <th key={key} className="p-3 text-left">
                          {key}
                        </th>
                      ))}
                  </tr>
                </thead>

                <tbody>
                  {currentSolutions.map((sol, i) => (
                    <tr
                      key={i}
                      className="border-b border-[#374151] hover:bg-[#111827] transition"
                    >
                      {Object.values(sol).map((val, idx) => (
                        <td key={idx} className="p-3">
                          {val}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>

              {solutions.length === 0 && (
                <p className="text-[#9CA3AF] text-center py-6">
                  No solutions available
                </p>
              )}
            </div>

            {/* PAGINATION */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center mt-4 text-sm">

                <button
                  onClick={() => setCurrentPage((prev) => prev - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 rounded bg-[#111827] hover:bg-[#374151] disabled:opacity-40"
                >
                  ← Prev
                </button>

                <span className="text-[#9CA3AF]">
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  onClick={() => setCurrentPage((prev) => prev + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 rounded bg-[#111827] hover:bg-[#374151] disabled:opacity-40"
                >
                  Next →
                </button>

              </div>
            )}
          </div>

          {/* GRAPH */}
          <div className="bg-[#1F2937]/80 backdrop-blur p-5 rounded-2xl border border-[#374151] shadow-lg flex flex-col">
            <h2 className="text-lg font-semibold text-[#F59E0B] mb-4">
              Visualization
            </h2>

            <div className="flex-1 flex items-center justify-center text-[#9CA3AF]">
              Graph coming soon...
            </div>
          </div>

        </div>

        {/* DEV PANEL */}
        {mode === "dev" && (
          <div className="bg-[#1F2937]/80 backdrop-blur p-5 rounded-2xl border border-[#374151] shadow-lg">

            <div className="flex gap-2 mb-4 flex-wrap">
              {["tokens", "coeffs", "meta", "warnings"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1 text-xs rounded-full transition ${
                    activeTab === tab
                      ? "bg-[#F59E0B] text-black"
                      : "bg-[#111827] text-[#9CA3AF]"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <pre className="text-sm text-green-400 bg-[#0B0F19] p-4 rounded-lg overflow-auto max-h-[300px]">
              {JSON.stringify(data[activeTab] || {}, null, 2)}
            </pre>

          </div>
        )}

      </div>
    </div>
  );
};

export default Dashboard;

const Card = ({ title, value }) => {
  return (
    <div className="bg-[#1F2937]/80 backdrop-blur p-5 rounded-2xl border border-[#374151] shadow-md hover:shadow-lg transition">
      <p className="text-xs text-[#F59E0B] uppercase tracking-wide">
        {title}
      </p>
      <p className="text-xl font-semibold mt-2">
        {value}
      </p>
    </div>
  );
};

