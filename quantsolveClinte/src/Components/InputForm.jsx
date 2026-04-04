import React, { useState } from "react";

const InputForm = () => {
  const [formData, setFormData] = useState({
    query: "",
    constraints: ""
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log(formData);
    setFormData({
      query: "",
      constraints: ""
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B0F19] px-4">
      
      <div className="w-full max-w-xl bg-[#1F2937] border border-[#374151] rounded-2xl p-8 shadow-lg">
        
        {/* Title */}
        <h2 className="text-2xl font-semibold text-[#F9FAFB] mb-6">
          Solve Optimization Problem
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          
          {/* Objective Function */}
          <div>
            <label className="text-sm font-medium text-[#9CA3AF]">
              Objective Function
            </label>
            <input
              type="text"
              name="query"
              value={formData.query}
              onChange={handleChange}
              placeholder="e.g., Maximize 10x + 20y"
              required
              autoComplete="off"
              className="mt-2 w-full bg-[#0B0F19] border border-[#374151] text-[#F9FAFB] placeholder:text-[#9CA3AF] p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F59E0B] transition"
            />
          </div>

          {/* Constraints */}
          <div>
            <label className="text-sm font-medium text-[#9CA3AF]">
              Constraints (Optional)
            </label>
            <div className="flex gap-3"> 
            <select name="variable" id="" className="mt-2 w-full bg-[#0B0F19] border border-[#374151] text-[#F9FAFB] p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F59E0B] transition">
              <option value="">Select a Varible</option>
              <option value="x">x</option>
              <option value="y">y</option>
              <option value="z">z</option>
            </select>
            <select name="operator" id="" className="mt-2 w-full bg-[#0B0F19] border border-[#374151] text-[#F9FAFB] p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F59E0B] transition">
              <option value="">Select an operator</option>
              <option value="≤">≤</option>
              <option value="≥">≥</option>
              <option value="<">&lt;</option>
              <option value=">">&gt;</option>
              <option value="=">=</option>
              <option value="!=">≠</option>
        
            </select>

            <input
              type="text"
              name="value"
              placeholder="Value"
              className="mt-2 w-full bg-[#0B0F19] border border-[#374151] text-[#F9FAFB] placeholder:text-[#9CA3AF] p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F59E0B] transition"
            />
            </div>
            

          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="mt-4 bg-[#F59E0B] text-black font-semibold py-3 rounded-lg hover:opacity-90 transition cursor-pointer"
          >
            Solve Problem
          </button>

        </form>
      </div>
    </div>
  );
};

export default InputForm;