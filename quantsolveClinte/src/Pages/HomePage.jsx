import React, { useRef } from "react";
import Navbar from "../Components/Navbar";
import InputForm from "../Components/InputForm";
import FlowChart from "../Components/Flowchart";

const HomePage = () => {

  const solverRef = useRef(null);
  const exampleRef = useRef(null);

  const scrollToSolver = () => {
    solverRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToExamples = () => {
    exampleRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="bg-[#0B0F19] text-[#F9FAFB] min-h-screen">

      <Navbar />

      {/* HERO */}
      <section className="px-6 py-20 max-w-7xl mx-auto grid md:grid-cols-2 gap-10 items-center">
        
        <div>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight">
            Parse. Solve.{" "}
            <span className="text-[#F59E0B]">Optimize.</span>
          </h1>

          <p className="mt-4 text-[#9CA3AF] text-lg">
            Turn raw algebraic equations into actionable solutions.
            Built with a custom parser and integer solver — no shortcuts.
          </p>

          <div className="mt-6 flex gap-4">
            
            <button 
              onClick={scrollToSolver}
              className="px-6 py-3 bg-[#F59E0B] text-black rounded-lg font-medium hover:bg-[#fbbf24] transition"
            >
              Try Live Solver
            </button>

            <button 
              onClick={scrollToExamples}
              className="px-6 py-3 border border-[#374151] rounded-lg hover:bg-[#1F2937] transition"
            >
              View Example
            </button>

          </div>
        </div>


       

      </section>

      {/* FEATURES */}
      <section className="px-6 py-20 max-w-7xl mx-auto">
        <h2 className="text-2xl font-semibold text-center mb-12">
          Why QuantSolve?
        </h2>

        <div className="grid md:grid-cols-4 gap-6">
          {["Algebraic Parsing","Multi-variable Solver","Integer Solutions","Infinity Detection"].map((title, i) => (
            <div key={i} className="bg-[#1F2937] p-6 rounded-xl border border-[#374151]">
              <h3 className="text-lg font-semibold text-[#F59E0B]">{title}</h3>
              <p className="text-sm text-[#9CA3AF] mt-2">
                Powerful engine capability built from scratch.
              </p>
            </div>
          ))}
        </div>
      </section>

      <section ref={exampleRef} className="px-6 py-20 mx-auto">
        <h2 className="text-2xl font-semibold text-center mb-12">
          Input → Output Examples
        </h2>

        <div className="">

          {/* EXAMPLES SECTION */}
    <section className="px-6 py-10  mx-auto">

    <div className="grid md:grid-cols-2 gap-6  p-6 rounded-xl border border-[#374151]">

        {/* Example 1 */}
        <div className="bg-[#1F2937] p-6 rounded-xl border border-[#374151] hover:border-[#F59E0B] transition text-center">
        <h3 className="text-[#F59E0B] font-semibold mb-2">Basic Equation</h3>
        <p className="text-sm text-[#9CA3AF]">Input:</p>
        <p className="font-mono">50x = 200</p>
        <p className="text-sm text-[#9CA3AF] mt-3">Output:</p>
        <p className="font-mono text-green-400">x = 4</p>
        </div>

        {/* Example 2 */}
        <div className="bg-[#1F2937] p-6 rounded-xl border border-[#374151] hover:border-[#F59E0B] transition text-center">
        <h3 className="text-[#F59E0B] font-semibold mb-2">Two Variables</h3>
        <p className="text-sm text-[#9CA3AF]">Input:</p>
        <p className="font-mono">10x + 20y = 100</p>
        <p className="text-sm text-[#9CA3AF] mt-3">Output:</p>
        <div className="font-mono text-green-400 text-sm space-y-1">
            <p>(x=10, y=0)</p>
            <p>(x=8, y=1)</p>
            <p>(x=6, y=2)</p>
            <p>(x=4, y=3)</p>
            <p>(x=2, y=4)</p>
            <p>(x=0, y=5)</p>
        </div>
        </div>

        {/* Example 3 */}
        <div className="bg-[#1F2937] p-6 rounded-xl border border-[#374151] hover:border-[#F59E0B] transition text-center">
        <h3 className="text-[#F59E0B] font-semibold mb-2 ">Multiple Variables</h3>
        <p className="text-sm text-[#9CA3AF]">Input:</p>
        <p className="font-mono">10a + 15b + 20c + 5d + 5e = 1000</p>
        <p className="text-sm text-[#9CA3AF] mt-3">Output:</p>
        <p className="font-mono text-green-400 text-sm">
            All valid 5-variable combinations
        </p>
        </div>

        {/* Example 4 */}
        <div className="bg-[#1F2937] p-6 rounded-xl border border-[#374151] hover:border-[#F59E0B] transition text-center">
        <h3 className="text-[#F59E0B] font-semibold mb-2">With Constraints</h3>
        <p className="text-sm text-[#9CA3AF]">Input:</p>
        <p className="font-mono">
            10x + 20y + 5z = 100 <br /> x &gt; 5, y &lt; 3
        </p>
        <p className="text-sm text-[#9CA3AF] mt-3">Output:</p>
        <p className="font-mono text-green-400 text-sm">
            Only valid constrained solutions
        </p>
        </div>

        {/* Example 5 */}
        <div className="bg-[#1F2937] p-6 rounded-xl border border-[#374151] hover:border-[#F59E0B] transition text-center">
        <h3 className="text-[#F59E0B] font-semibold mb-2">Order of Operations</h3>
        <p className="text-sm text-[#9CA3AF]">Input:</p>
        <p className="font-mono">(10x + 20y) * 2 + 5z = 500</p>
        <p className="text-sm text-[#9CA3AF] mt-3">Output:</p>
        <p className="font-mono text-green-400 text-sm">
            Correctly parsed using BODMAS
        </p>
        </div>

        {/* Example 6 */}
        <div className="bg-[#1F2937] p-6 rounded-xl border border-[#374151] hover:border-red-500 transition text-center">
        <h3 className="text-red-400 font-semibold mb-2">Impossible Case</h3>
        <p className="text-sm text-[#9CA3AF]">Input:</p>
        <p className="font-mono">2x + 4y = 3</p>
        <p className="text-sm text-[#9CA3AF] mt-3">Output:</p>
        <p className="font-mono text-red-400 text-sm">
            No whole-number solutions
        </p>
        </div>

    </div>
    </section>

        </div>
      </section>

      {/* FLOWCHART */}
          <FlowChart />

      <section ref={solverRef} className=" max-w-5xl mx-auto">
        <h2 className="text-2xl font-semibold mb-6 text-center">
          Try the Solver
        </h2>

        <div className="bg-[#1F2937] m-2 ">
          <InputForm />
        </div>
      </section>

          
      {/* FOOTER */}
      <footer className="border-t border-[#374151] py-6 text-center text-sm text-[#9CA3AF]">
        Built By TalentXchange | QuantSolve © 2026
      </footer>

    </div>
  );
};

export default HomePage;