import React, { useRef, useEffect } from "react";
import Navbar from "../Components/Navbar.jsx";
import InputForm from "../Components/InputForm.jsx";
import FlowChart from "../Components/Flowchart.jsx";
import PipelineLoader from "../Components/PipelineLoader.jsx";

const HomePage = () => {

  const solverRef = useRef(null);
  const exampleRef = useRef(null);

  const scrollToSolver = () => {
    solverRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToExamples = () => {
    exampleRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const elements = document.querySelectorAll(".fade-up");

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("show");
          }
        });
      },
      { threshold: 0.2 }
    );

    elements.forEach((el) => observer.observe(el));
  }, []);

  return (
    <div className="bg-[#0B0F19] text-[#F9FAFB] min-h-screen">

      <Navbar />

      {/* HERO */}
      <section className="px-6 py-20 max-w-7xl mx-auto grid md:grid-cols-2 gap-50 items-center">
        
        <div className="fade-up">
          <h1 className="text-4xl md:text-5xl font-bold leading-tight">
            Parse. Solve.{" "}
            <span className="text-[#F59E0B]">Optimize.</span>
          </h1>

          <p className="mt-4 text-[#9CA3AF] text-lg">
            Turn raw algebraic equations into actionable solutions.
            Built with a custom parser and integer solver — no shortcuts.
          </p>

          <div className="mt-6 flex justify-between fade-up delay-1">
            
            <button 
              onClick={scrollToSolver}
              className="px-6 py-3 bg-[#F59E0B] text-black rounded-lg font-medium 
              hover:bg-[#fbbf24] hover:scale-105 active:scale-95 
              transition duration-200 shadow-md hover:shadow-lg cursor-pointer"
            >
              Try Live Solver
            </button>

            <button 
              onClick={scrollToExamples}
              className="px-6 py-3 border border-[#374151] rounded-lg 
              hover:bg-[#1F2937] hover:scale-105 active:scale-95 
              transition duration-200 cursor-pointer"
            >
              View Example
            </button>

          </div>
        </div>
        <div className="fade-up delay-2 w-full  p-6  rounded-xl ">
        <PipelineLoader/>
        </div>

      </section>

      {/* FEATURES */}
      <section className="px-6 py-20 max-w-7xl mx-auto">
        <h2 className="text-[#F59E0B] text-2xl font-bold mb-10 text-center fade-up">
          Why QuantSolve?
        </h2>

        <div className="grid md:grid-cols-4 gap-6">
          {["Algebraic Parsing","Multi-variable Solver","Integer Solutions","Infinity Detection"].map((title, i) => (
            
            <div 
              key={i} 
              className={`fade-up delay-${i+1} bg-[#1F2937] p-6 rounded-xl border border-[#374151] 
              hover:scale-105 hover:shadow-[0_0_20px_rgba(245,158,11,0.3)] transition duration-300`}
            >
              <h3 className="text-lg font-semibold text-[#F59E0B]">{title}</h3>
              <p className="text-sm text-[#9CA3AF] mt-2">
                Powerful engine capability built from scratch.
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* EXAMPLES */}
      <section ref={exampleRef} className="px-6 py-20 max-w-7xl mx-auto">
        <h2 className="text-[#F59E0B] text-2xl font-bold mb-10 text-center fade-up">
          Input → Output Examples
        </h2>

        <div className="grid md:grid-cols-2 gap-6 p-6 rounded-xl border border-[#374151]">

          {[
            {title:"Basic Equation",input:"50x = 200",output:"x = 4",color:"text-green-400"},
            {title:"Two Variables",input:"10x + 20y = 100",output:"Multiple valid pairs",color:"text-green-400"},
            {title:"Multiple Variables",input:"10a + 15b + 20c + 5d + 5e = 1000",output:"All valid combinations",color:"text-green-400"},
            {title:"With Constraints",input:"10x + 20y + 5z = 100\nx > 5, y < 3",output:"Filtered solutions",color:"text-green-400"},
            {title:"Order of Operations",input:"(10x + 20y) * 2 + 5z = 500",output:"BODMAS respected",color:"text-green-400"},
            {title:"Impossible Case",input:"2x + 4y = 3",output:"No solutions",color:"text-red-400"},
          ].map((ex,i)=>(
            <div 
              key={i}
              className={`fade-up delay-${i%3} bg-[#1F2937] p-6 rounded-xl border border-[#374151] 
              hover:scale-[1.03] hover:shadow-[0_0_25px_rgba(245,158,11,0.2)] 
              transition duration-300 text-center`}
            >
              <h3 className="text-[#F59E0B] font-semibold mb-2">{ex.title}</h3>
              <p className="text-sm text-[#9CA3AF]">Input:</p>
              <pre className="font-mono whitespace-pre-wrap">{ex.input}</pre>
              <p className="text-sm text-[#9CA3AF] mt-3">Output:</p>
              <p className={`font-mono ${ex.color}`}>{ex.output}</p>
            </div>
          ))}

        </div>
      </section>

      {/* SOLVER */}
      <section ref={solverRef} className="fade-up max-w-5xl mx-auto py-20">
        <h2 className="text-[#F59E0B] text-2xl font-bold mb-10 text-center">
          Try the Solver
        </h2>

        <div className=" m-6 p-4 rounded-xl ">
          <InputForm />
        </div>
      </section>

      {/* FLOWCHART */}
      <div className="fade-up delay-2">
        <FlowChart />
      </div>

      {/* FOOTER */}
      <footer className="border-t border-[#374151] py-6 text-center text-sm text-[#9CA3AF]">
        Built By TalentXchange | QuantSolve © 2026
      </footer>

    </div>
  );
};

export default HomePage;