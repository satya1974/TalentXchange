import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import ThemeProvider from "./context/ThemeContext";
import Home from "./pages/Home";
import Solver from "./pages/Solver";
import HowItWorks from "./pages/HowItWorks";
import Docs from "./pages/Docs";

function App() {
    return (
        <ThemeProvider>
            <BrowserRouter>
                <div className="shell">
                    <Navbar />
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/solver" element={<Solver />} />
                        <Route path="/how-it-works" element={<HowItWorks />} />
                        {/* <Route path="/docs" element={<Docs />} /> */}
                    </Routes>
                </div>
            </BrowserRouter>
        </ThemeProvider>
    );
}

export default App;
