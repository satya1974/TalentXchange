import { createBrowserRouter, RouterProvider } from "react-router-dom";
import HomePage from "./Pages/HomePage.jsx";
import Dashboard from "../src/Pages/Dashboard.jsx";
const router = createBrowserRouter([
  { path: "/", element: <HomePage /> },
  { path: "/dashboard", element: <Dashboard /> },
]);

function App() {
  return <RouterProvider router={router} />;
}
export default App;