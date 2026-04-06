import { useState } from "react";

export default function EquationInput({ onSolve }) {
    const [equation, setEquation] = useState("");

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow">
            <h2 className="text-lg font-semibold mb-3">Equation</h2>

            <input
                type="text"
                value={equation}
                onChange={(e) => setEquation(e.target.value)}
                placeholder="10x + 20y = 100"
                className="w-full p-3 border rounded-lg dark:bg-gray-900"
            />

            <button
                onClick={() => onSolve(equation)}
                className="mt-4 bg-primary text-white px-6 py-2 rounded-lg"
            >
                Solve
            </button>
        </div>
    );
}
