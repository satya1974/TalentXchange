## 1. Introduction

QuantSolve is a web-based algebraic equation engine designed to parse user-entered mathematical equations containing multiple variables and compute all valid whole-number solutions under given constraints. The system is intended to simulate financial asset allocation scenarios where fractional values are not allowed.

The system consists of:

* A custom algebraic expression parser
* A multi-variable integer equation solver
* A constraint engine
* A financial-style dashboard UI

The system must be built without using eval(), SymPy, or any external algebra libraries.

---

## 2. Problem Definition

Users will input equations such as:

150a + 100b + 50c + 10d = 5000

The system must:

1. Parse the equation
2. Identify variables and coefficients
3. Apply constraints (e.g., a > 2, b < 10)
4. Compute all valid non-negative integer solutions
5. Display solutions in sorted order
6. Handle syntax errors and impossible equations
7. Detect unbounded solution space

---

## 3. Assumptions

1. All variables represent quantities and must be non-negative integers.
2. Only one equation will be solved at a time.
3. Variables may have names (apple, google, tesla).
4. Supported operators:

   * Addition (+)
   * Subtraction (-)
   * Multiplication (*)
   * Division (/)
   * Parentheses ()
5. Implicit multiplication must be supported:

   * 10x
   * 2(x + y)
6. The system must return ALL valid solutions.
7. Constraints will be provided through UI form fields.
8. Default variable bounds may be applied if user does not provide limits.
9. The equation will be linear after expansion (no powers like x²).

---

## 4. Functional Requirements

### FR1 – Equation Input

The system shall accept algebraic equations as text input.

### FR2 – Lexer

The system shall tokenize:

* Numbers
* Variables
* Operators
* Parentheses
* Equal sign

### FR3 – Parser

The system shall:

* Respect operator precedence (PEMDAS/BODMAS)
* Handle nested parentheses
* Support implicit multiplication
* Build an internal representation of the equation

### FR4 – Equation Normalization

The system shall convert equations into a standard linear form:

a1x1 + a2x2 + a3x3 + ... = C

### FR5 – Multi-variable Solver

The system shall compute all non-negative integer solutions.

### FR6 – Constraint Engine

The system shall allow constraints such as:

* x > 5
* y < 10
* z >= 2
* a must be even
* b must be odd
* upper bounds and lower bounds

### FR7 – Error Handling

The system shall detect:

* Invalid syntax
* Division by zero
* Impossible equations
* Unbounded solution space

### FR8 – Output

The system shall:

* Display all valid combinations
* Sort results
* Display total number of solutions

---

## 5. Non-Functional Requirements

1. The solver must handle 4–6 variables efficiently.
2. The system must not crash on invalid input.
3. The UI must be responsive.
4. The backend must be modular.
5. The parser and solver must be independent modules.
6. The system must be scalable for larger equations.

---

## 6. Solver Specification

### 6.1 Equation Type

The solver handles **Linear Diophantine Equations**:

a1x1 + a2x2 + a3x3 + ... + anxn = C

Where:

* xi ≥ 0
* xi are integers
* ai are integer coefficients
* C is a constant

---

### 6.2 Solution Conditions

An equation has integer solutions only if:

C is divisible by gcd(a1, a2, a3, ..., an)

If not divisible → No solutions exist.

---

### 6.3 Solver Strategy

The solver will use:

1. Normalize equation
2. Extract coefficients
3. Apply constraints
4. Determine bounds
5. Use recursive bounded search
6. Prune invalid branches early
7. Store valid solutions
8. Sort results
9. Return results

---

### 6.4 Unbounded Solution Detection

The system should detect unbounded solution space when:

* Variables have no upper bounds
* Equation allows compensation between variables
* Search space becomes infinite or extremely large

System should return:
"Unbounded solution space. Please apply limits."

---

### 6.5 Data Structures Required

The engine will use:

* Token list
* Abstract Syntax Tree (AST)
* HashMap for variable coefficients
* Constraint objects
* Recursive stack for solver
* Array/List for solutions
* Priority sort for ordered output

---

## 7. System Modules

The system will contain:

1. Input Handler
2. Lexer
3. Parser
4. AST Builder
5. Equation Normalizer
6. Constraint Engine
7. Integer Solver
8. Result Formatter
9. Error Handler
10. API Layer
11. Frontend Dashboard

---

## 8. Expected Workflow

User Input Equation
→ Lexer
→ Parser
→ AST
→ Normalize Equation
→ Apply Constraints
→ Solve Integer Equation
→ Sort Results
→ Display Output
