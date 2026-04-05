import React, { useState } from "react";
import { Trash2, Plus } from "lucide-react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const InputForm = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    query: "",
    constraints: [{ variable: "", operator: ">=", value: "" }]
  });

  // 🔥 SAFE CONSTRAINT TRANSFORM
  const transformConstraints = (constraintsArray) => {
    const result = {};

    constraintsArray.forEach(({ variable, operator, value }) => {
      if (!variable) return;

      if (!result[variable]) result[variable] = {};

      const numValue = value !== "" ? Number(value) : null;

      switch (operator) {
        case ">":
        case ">=":
          if (numValue !== null && !isNaN(numValue)) {
            result[variable].min = numValue;
          }
          break;

        case "<":
        case "<=":
          if (numValue !== null && !isNaN(numValue)) {
            result[variable].max = numValue;
          }
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

  // 🔥 VALIDATION
  const validateForm = () => {
    if (!formData.query.trim()) {
      return "Equation is required";
    }

    for (let c of formData.constraints) {
      if (!c.variable) continue;

      if (c.operator !== "even" && c.operator !== "odd") {
        if (c.value === "" || isNaN(Number(c.value))) {
          return `Invalid value for variable "${c.variable}"`;
        }
      }
    }

    return "";
  };

  // HANDLERS
  const handleQueryChange = (e) => {
    setFormData((prev) => ({ ...prev, query: e.target.value }));
  };

  const addConstraint = () => {
    setFormData((prev) => ({
      ...prev,
      constraints: [
        ...prev.constraints,
        { variable: "", operator: ">=", value: "" }
      ]
    }));
  };

  const removeConstraint = (index) => {
    const updated = formData.constraints.filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, constraints: updated }));
  };

  const updateConstraint = (index, key, value) => {
    const updated = [...formData.constraints];
    updated[index][key] = value;
    setFormData((prev) => ({ ...prev, constraints: updated }));
  };

  // 🔥 SUBMIT (FIXED)
  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setLoading(true);

    const transformed = transformConstraints(formData.constraints);

    const payload = {
      equation: formData.query.trim(),
      ...(Object.keys(transformed).length > 0 && { constraints: transformed })
    };

    console.log("FINAL PAYLOAD:", JSON.stringify(payload, null, 2));

    try {
      const res = await axios.post("http://localhost:5500/solve", payload);

      if (res.data?.success) {
        navigate("/dashboard", { state: res.data });
      } else {
        setError("Invalid response from server");
      }

    } catch (err) {
      console.error(err);

      if (err.response?.status === 422) {
        setError("Invalid equation or constraints (check format)");
      } else {
        setError(err.response?.data?.message || "Something went wrong");
      }

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center bg-[#0B0F19] px-4 min-h-screen">

      <div className="w-full max-w-xl bg-[#1F2937] border border-[#F59E0B] rounded-2xl p-8 shadow-lg">

        <h2 className="text-2xl font-semibold text-[#F9FAFB] mb-6">
          Solve Optimization Problem
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">

          {/* ERROR */}
          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-400 p-2 rounded text-sm">
              {error}
            </div>
          )}

          {/* EQUATION */}
          <div>
            <label className="text-sm text-[#9CA3AF]">Equation</label>
            <input
              type="text"
              value={formData.query}
              onChange={handleQueryChange}
              placeholder="e.g., 10x + 20y = 100"
              className="mt-2 w-full bg-[#0B0F19] border border-[#374151] text-[#F9FAFB] p-3 rounded-lg focus:ring-2 focus:ring-[#F59E0B]"
            />
          </div>

          {/* CONSTRAINTS */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm text-[#9CA3AF]">Constraints</label>
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
                <div key={index} className="flex gap-2 items-center bg-[#0B0F19] p-3 rounded-lg">

                  <input
                    type="text"
                    value={c.variable}
                    onChange={(e) =>
                      updateConstraint(index, "variable", e.target.value)
                    }
                    placeholder="x"
                    className="bg-[#1F2937] p-2 rounded text-[#F9FAFB]"
                  />

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

          {/* SUBMIT */}
          <button
            type="submit"
            disabled={loading}
            className="mt-4 bg-[#F59E0B] text-black font-semibold py-3 rounded-lg flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
                Solving...
              </>
            ) : (
              "Solve Problem"
            )}
          </button>

        </form>
      </div>

      {loading && <FullScreenLoader />}
    </div>
  );
};

export default InputForm;

// 🔥 LOADER
const FullScreenLoader = () => {
  return (
    <div className="fixed inset-0 bg-[#0B0F19]/80 flex items-center justify-center z-50">
      <div className="flex flex-col items-center gap-3">
        <div className="flex gap-2">
          <div className="w-3 h-3 bg-[#F59E0B] rounded-full animate-bounce"></div>
          <div className="w-3 h-3 bg-[#F59E0B] rounded-full animate-bounce [animation-delay:0.2s]"></div>
          <div className="w-3 h-3 bg-[#F59E0B] rounded-full animate-bounce [animation-delay:0.4s]"></div>
        </div>
        <p className="text-[#9CA3AF] text-sm">
          Solving your equation...
        </p>
      </div>
    </div>
  );
};