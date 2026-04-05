import React from "react";

const steps = [
  {
    title: "INPUT PROCESSING",
    desc: "Capture, validate, and normalize user input for consistency.",
  },
  {
    title: "LEXICAL ANALYSIS",
    desc: "Convert input into tokens and resolve implicit operations.",
  },
  {
    title: "SYNTAX & STRUCTURE",
    desc: "Parse tokens and build an Abstract Syntax Tree (AST).",
  },
  {
    title: "EQUATION OPTIMIZATION",
    desc: "Simplify expressions and combine like terms.",
  },
  {
    title: "SOLUTION ENGINE",
    desc: "Apply constraints, compute solutions, and format output.",
  },
];

const FlowChart = () => {
  return (
    <div className="bg-[#0B0F19] p-10">
      <h1 className="text-[#F59E0B] text-2xl font-bold mb-10 text-center">
        ALGEBRAIC SOLVER PIPELINE
      </h1>

      <div className="flex flex-wrap justify-center items-center gap-8">
        {steps.map((step, index) => (
          <div key={index} className="flex items-center">
            
            {/* BOX */}
            <div className="w-[160px] p-5 rounded-2xl border border-[#F59E0B] text-[#F59E0B] shadow-[0_0_12px_#F59E0B] hover:shadow-[0_0_20px_#F59E0B] transition-shadow duration-300">
              <h2 className="font-bold text-lg mb-2">{step.title}</h2>
              <p className="text-sm opacity-80">{step.desc}</p>
            </div>

            {/* ARROW */}
            {index !== steps.length - 1 && (
              <div className="hidden md:block mx-4 text-[#F59E0B] text-2xl">
                →
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default FlowChart;