import React, { useState } from "react";
import { Trash2, Plus } from "lucide-react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
const InputForm = () => {

  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    query: "",
    constraints: [
      { variable: "", operator: ">=", value: "" }
    ]
  });

  const transformConstraints = (constraintsArray) => {
    const result = {};

    constraintsArray.forEach(({ variable, operator, value }) => {
      if (!variable) return;

      if (!result[variable]) {
        result[variable] = {};
      }

      const numValue = Number(value);

      switch (operator) {
        case ">":
          result[variable].min = numValue;
          break;
        case ">=":
          result[variable].min = numValue;
          break;
        case "<":
          result[variable].max = numValue;
          break;
        case "<=":
          result[variable].max = numValue;
          break;
        case "even":
          result[variable].even = true;
          break;
        case "odd":
          result[variable].odd = true;
          break;
        default:
          break;
      }
    });

    return result;
  };

  // Handle query
  const handleQueryChange = (e) => {
    setFormData((prev) => ({ ...prev, query: e.target.value }));
  };

  // Add constraint
  const addConstraint = () => {
    setFormData((prev) => ({
      ...prev,
      constraints: [
        ...prev.constraints,
        { variable: "", operator: ">=", value: "" }
      ]
    }));
  };

  // Remove constraint
  const removeConstraint = (index) => {
    const updated = formData.constraints.filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, constraints: updated }));
  };

  // Update constraint
  const updateConstraint = (index, key, value) => {
    const updated = [...formData.constraints];
    updated[index][key] = value;
    setFormData((prev) => ({ ...prev, constraints: updated }));
  };

  const  handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post("http://localhost:5500/solve", {
        equation: formData.query,
        constraints: transformConstraints(formData.constraints)
      });
      console.log(res.data);
    } catch (error) {
      console.error("Error submitting form:", error);
    }
    
  };

  return (
    <div className="flex items-center justify-center bg-[#0B0F19] px-4">

      <div className="w-full max-w-xl bg-[#1F2937] border border-[#F59E0B] rounded-2xl p-8 shadow-lg hover:shadow-[0_0_20px_#F59E0B] transition">

        <h2 className="text-2xl font-semibold text-[#F9FAFB] mb-6">
          Solve Optimization Problem
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">

          {/* Query */}
          <div>
            <label className="text-sm text-[#9CA3AF]">
              Equation
            </label>
            <input
              type="text"
              value={formData.query}
              onChange={handleQueryChange}
              placeholder="e.g., 10x + 20y = 100"
              className="mt-2 w-full bg-[#0B0F19] border border-[#374151] text-[#F9FAFB] p-3 rounded-lg focus:ring-2 focus:ring-[#F59E0B]"
            />
          </div>

          {/* Constraints */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm text-[#9CA3AF]">
                Constraints
              </label>
              <button
                type="button"
                onClick={addConstraint}
                className="text-[#F59E0B] flex items-center gap-1"
              >
                <Plus size={16} /> Add Rule
              </button>
            </div>

            <div className="space-y-3">
              {formData.constraints.map((c, index) => (
                <div
                  key={index}
                  className="flex gap-2 items-center bg-[#0B0F19] p-3 rounded-lg"
                >

                  {/* Variable */}
                  <input
                    type="text"
                    value={c.variable}
                    onChange={(e) =>
                      updateConstraint(index, "variable", e.target.value)
                    }
                    placeholder="x"
                    className="bg-[#1F2937] p-2 rounded text-[#F9FAFB]"
                  />

                  {/* Operator */}
                  <select
                    value={c.operator}
                    onChange={(e) =>
                      updateConstraint(index, "operator", e.target.value)
                    }
                    className="bg-[#1F2937] p-2 rounded text-[#F9FAFB]"
                  >
                    <option value=">=">&ge;</option>
                    <option value="<=">&le;</option>
                    <option value=">">&gt;</option>
                    <option value="<">&lt;</option>
                    <option value="even">even</option>
                    <option value="odd">odd</option>
                  </select>

                  {/* Value (hide for even/odd) */}
                  {c.operator !== "even" && c.operator !== "odd" && (
                    <input
                      type="number"
                      value={c.value}
                      onChange={(e) =>
                        updateConstraint(index, "value", e.target.value)
                      }
                      placeholder="value"
                      className="bg-[#1F2937] p-2 rounded text-[#F9FAFB]"
                    />
                  )}

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={() => removeConstraint(index)}
                    className="text-red-400"
                  >
                    <Trash2 size={16} />
                  </button>

                </div>
              ))}
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="mt-4 bg-[#F59E0B] text-black font-semibold py-3 rounded-lg hover:bg-[#D97706] transition"
          >
            Solve Problem
          </button>

        </form>
      </div>
    </div>
  );
};

export default InputForm;