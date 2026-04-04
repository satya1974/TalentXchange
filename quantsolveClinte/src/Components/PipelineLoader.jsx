import React, { useEffect, useState } from "react";
import { IoPlayForwardSharp } from "react-icons/io5";

const steps = [
  "Parsing Input",
  "Tokenizing",
  "Building AST",
  "Applying Constraints",
  "Solving",
  "Formatting Results",
];

const PipelineLoader = () => {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActive((prev) => (prev + 1) % steps.length);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col w-full gap-2 text-2xl text-[#9CA3AF]">
      {steps.map((step, i) => (
        <p
          key={i}
          className={`transition flex gap-2 items-center ${
            i === active
              ? "text-[#F59E0B] font-semibold"
              : "opacity-50"
          }`}
        >
          {i === active ? <IoPlayForwardSharp /> : "• "} {step}
        </p>
      ))}
    </div>
  );
};

export default PipelineLoader;