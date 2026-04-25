import { Navigate, Route, Routes } from "react-router-dom";
import PhoneShell from "./components/PhoneShell.jsx";
import Onboarding from "./screens/Onboarding.jsx";
import Chat from "./screens/Chat.jsx";
import Submit from "./screens/Submit.jsx";
import Rules from "./screens/Rules.jsx";
import Wall from "./screens/Wall.jsx";
import Tagesbericht from "./screens/Tagesbericht.jsx";
import Admin from "./screens/Admin.jsx";

function PhoneRoute({ children }) {
  return <PhoneShell>{children}</PhoneShell>;
}

function Index() {
  const onboarded = localStorage.getItem("hm.onboarded") === "1";
  return <Navigate to={onboarded ? "/chat" : "/onboarding"} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/onboarding" element={<PhoneRoute><Onboarding /></PhoneRoute>} />
      <Route path="/chat"       element={<PhoneRoute><Chat /></PhoneRoute>} />
      <Route path="/submit"     element={<PhoneRoute><Submit /></PhoneRoute>} />
      <Route path="/rules"      element={<PhoneRoute><Rules /></PhoneRoute>} />
      <Route path="/wall"         element={<Wall />} />
      <Route path="/tagesbericht" element={<Tagesbericht />} />
      <Route path="/admin"        element={<Admin />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
