import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import Navbar from "../Components/Navbar";

const Dashboard = () => {
  const location = useLocation();
  const data = location.state || {};

  const [activeTab, setActiveTab] = useState("tokens");

  const solutions = data?.solutions || [];

  return (
    <div className="bg-[#0B0F19] text-[#F9FAFB] min-h-screen">

      {/* NAVBAR */}
      <Navbar />

      <div className="p-6 space-y-6">

        <div className="grid md:grid-cols-4 gap-4">
          <Card title="Equation" value={data.input || "-"} />
          <Card title="Variables" value={data?.meta?.variableCount || 0} />
          <Card title="Solutions" value={data.solutionCount || 0} />
          <Card title="Status" value={data.success ? "Success" : "Failed"} />
        </div>

        <div className="grid md:grid-cols-2 gap-6">

          {/* TABLE */}
          <div className="bg-[#1F2937] p-4 rounded-xl border border-[#374151]">
            <h2 className="text-[#F59E0B] mb-4">Solutions</h2>

            <div className="max-h-[400px] overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[#9CA3AF] border-b border-[#374151]">
                    {solutions[0] &&
                      Object.keys(solutions[0]).map((key) => (
                        <th key={key} className="p-2 text-left">{key}</th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {solutions.map((sol, i) => (
                    <tr
                      key={i}
                      className="border-b border-[#374151] hover:bg-[#111827]"
                    >
                      {Object.values(sol).map((val, idx) => (
                        <td key={idx} className="p-2">{val}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>

              {solutions.length === 0 && (
                <p className="text-[#9CA3AF] text-center py-4">
                  No solutions available
                </p>
              )}
            </div>
          </div>

          {/* GRAPH PLACEHOLDER */}
          <div className="bg-[#1F2937] p-4 rounded-xl border border-[#374151]">
            <h2 className="text-[#F59E0B] mb-4">Visualization</h2>

            <div className="h-[400px] flex items-center justify-center text-[#9CA3AF]">
              Graph coming soon...
            </div>
          </div>

        </div>

        <div className="bg-[#1F2937] p-4 rounded-xl border border-[#374151]">
          
          {/* Tabs */}
          <div className="flex gap-3 mb-4 flex-wrap">
            {["tokens", "coeffs", "meta", "warnings"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1 rounded text-sm ${
                  activeTab === tab
                    ? "bg-[#F59E0B] text-black"
                    : "bg-[#111827] text-[#9CA3AF]"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Content */}
          <pre className="text-sm text-green-400 overflow-auto max-h-[300px]">
            {JSON.stringify(data[activeTab] || {}, null, 2)}
          </pre>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;

const Card = ({ title, value }) => {
  return (
    <div className="bg-[#1F2937] p-4 rounded-xl border border-[#374151]">
      <p className="text-sm text-[#9CA3AF]">{title}</p>
      <p className="text-lg font-semibold text-[#F9FAFB] mt-1">{value}</p>
    </div>
  );
};