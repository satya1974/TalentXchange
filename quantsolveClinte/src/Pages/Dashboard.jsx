import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import Navbar from "../Components/Navbar";
import Tree from "react-d3-tree";

/* 🔥 UNIVERSAL AST CONVERTER */
const convertAST = (node) => {
  if (!node) return null;

  // 🔁 AUTO-UNWRAP COMMON WRAPPERS
  if (node.ast) return convertAST(node.ast);
  if (node.expr) return convertAST(node.expr);
  if (node.body) return convertAST(node.body);

  // 🟢 NUMBER
  if (
    node.type === "Number" ||
    node.type === "Literal" ||
    typeof node.value === "number"
  ) {
    return {
      name: String(node.value ?? node.raw ?? "?"),
      type: "number"
    };
  }

  // 🔵 VARIABLE
  if (
    node.type === "Variable" ||
    node.type === "Identifier" ||
    node.name
  ) {
    return {
      name: node.name,
      type: "variable"
    };
  }

  // 🟡 BINARY OP
  if (
    node.type === "BinaryOp" ||
    node.type === "BinaryExpression" ||
    node.operator
  ) {
    return {
      name: node.operator || "?",
      type: "operator",
      children: [
        convertAST(node.left),
        convertAST(node.right)
      ].filter(Boolean)
    };
  }

  // 🔴 EQUATION SUPPORT (VERY COMMON)
  if (node.type === "Equation") {
    return {
      name: "=",
      type: "operator",
      children: [
        convertAST(node.left),
        convertAST(node.right)
      ]
    };
  }

  // 🧠 LAST RESORT: TRY CHILD KEYS
  const possibleChildren = Object.values(node).filter(
    (v) => typeof v === "object"
  );

  if (possibleChildren.length > 0) {
    return {
      name: node.type || "Node",
      type: "unknown",
      children: possibleChildren
        .map(convertAST)
        .filter(Boolean)
    };
  }

  return {
    name: node.type || "Unknown",
    type: "unknown"
  };
};

/* 🎨 NODE COLORS */
const getNodeColor = (type) => {
  switch (type) {
    case "operator":
      return "#F59E0B";
    case "variable":
      return "#3B82F6";
    case "number":
      return "#10B981";
    default:
      return "#9CA3AF";
  }
};

/* 🌳 AST VIEWER */
const ASTViewer = ({ ast }) => {
  const containerRef = useRef(null);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setTranslate({
        x: rect.width / 2,
        y: 80
      });
    }
  }, []);

  if (!ast) {
    return (
      <p className="text-[#9CA3AF] text-center">
        No AST available
      </p>
    );
  }

  const treeData = convertAST(ast);

  console.log("🔍 RAW AST:", ast);
  console.log("🌳 TREE:", treeData);

  if (!treeData) {
    return (
      <p className="text-red-400 text-center">
        Failed to parse AST
      </p>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-[500px] bg-[#0B0F19] rounded-xl overflow-hidden border border-[#374151]"
    >
      <Tree
        data={[treeData]}   // ✅ FIXED ROOT
        orientation="vertical"
        translate={translate}
        zoomable
        zoom={0.9}
        scaleExtent={{ min: 0.5, max: 2 }}
        pathFunc="diagonal"
        nodeSize={{ x: 180, y: 120 }}
        separation={{ siblings: 2, nonSiblings: 2.5 }}
        renderCustomNodeElement={({ nodeDatum }) => {
          const color = getNodeColor(nodeDatum.type);

          return (
            <g>
              <circle
                r={26}
                fill="#111827"
                stroke={color}
                strokeWidth="3"
              />
              <text
                fill="#F9FAFB"
                fontSize="14"
                fontWeight="600"
                textAnchor="middle"
                dy=".35em"
              >
                {nodeDatum.name}
              </text>
            </g>
          );
        }}
        styles={{
          links: {
            stroke: "#4B5563",
            strokeWidth: 2
          }
        }}
      />
    </div>
  );
};

/* 📊 DASHBOARD */
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

  const currentSolutions = solutions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(solutions.length / itemsPerPage);

  console.log("🚨 FINAL AST:", data.ast);

  return (
    <div className="bg-[#0B0F19] text-[#F9FAFB] min-h-screen">
      <Navbar />

      <div className="max-w-7xl mx-auto p-6 space-y-8">

        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Solver Dashboard</h1>

          <div className="flex bg-[#1F2937] rounded-full p-1 border border-[#374151]">
            {["user", "dev"].map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-4 py-1 text-sm rounded-full ${
                  mode === m
                    ? "bg-[#F59E0B] text-black"
                    : "text-[#9CA3AF]"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-6 text-center">
          <Card title="Equation" value={data.input || "-"} />
          <Card title="Variables" value={data?.meta?.variableCount || 0} />
          <Card title="Solutions" value={data.solutionCount || 0} />
          <Card title="Status" value={data.success ? "Success" : "Failed"} />
        </div>

        <div className="grid md:grid-cols-2 gap-6">

          {/* SOLUTIONS */}
          <div className="bg-[#1F2937]/80 p-5 rounded-2xl border border-[#374151]">
            <h2 className="text-lg text-[#F59E0B] mb-4">Solutions</h2>

            <div className="max-h-[420px] overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-[#111827]">
                  <tr>
                    {solutions[0] &&
                      Object.keys(solutions[0]).map((key) => (
                        <th key={key} className="p-3 text-left">
                          {key}
                        </th>
                      ))}
                  </tr>
                </thead>

                <tbody>
                  {currentSolutions.map((sol, i) => (
                    <tr key={i} className="border-b border-[#374151]">
                      {Object.values(sol).map((val, idx) => (
                        <td key={idx} className="p-3">{val}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>

              {solutions.length === 0 && (
                <p className="text-center text-[#9CA3AF] py-6">
                  No solutions available
                </p>
              )}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-between mt-4 text-sm">
                <button
                  onClick={() => setCurrentPage(p => p - 1)}
                  disabled={currentPage === 1}
                >
                  ← Prev
                </button>

                <span>
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  onClick={() => setCurrentPage(p => p + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next →
                </button>
              </div>
            )}
          </div>

          {/* AST */}
          <div className="bg-[#1F2937]/80 p-5 rounded-2xl border border-[#374151]">
            <h2 className="text-lg font-semibold text-[#F59E0B] mb-4">
              Visualization
            </h2>

            <p className="text-sm text-[#9CA3AF] mb-2">
              Abstract Syntax Tree
            </p>

            <ASTViewer ast={data.ast} />
          </div>

        </div>

        {/* DEV PANEL */}
        {mode === "dev" && (
          <div className="bg-[#1F2937]/80 p-5 rounded-2xl border border-[#374151]">
            <pre className="text-green-400 bg-[#0B0F19] p-4 rounded max-h-[300px] overflow-auto">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        )}

      </div>
    </div>
  );
};

export default Dashboard;

/* CARD */
const Card = ({ title, value }) => (
  <div className="bg-[#1F2937] p-5 rounded-xl border border-[#374151]">
    <p className="text-sm text-[#F59E0B]">{title}</p>
    <p className="text-xl font-semibold">{value}</p>
  </div>
);