import { Navigate, Route, Routes } from "react-router-dom";
import PhoneShell from "./components/PhoneShell.jsx";
import Onboarding from "./screens/Onboarding.jsx";
import Chat from "./screens/Chat.jsx";
import Submit from "./screens/Submit.jsx";
import Rules from "./screens/Rules.jsx";
import Wall from "./screens/Wall.jsx";
import Tagesbericht from "./screens/Tagesbericht.jsx";
import Admin from "./screens/Admin.jsx";
import Talk from "./screens/Talk.jsx";

function PhoneRoute({ children }) {
  return <PhoneShell>{children}</PhoneShell>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Wall />} />
      <Route path="/wall" element={<Navigate to="/" replace />} />

      <Route path="/m"            element={<Navigate to="/m/chat" replace />} />
      <Route path="/m/onboarding" element={<PhoneRoute><Onboarding /></PhoneRoute>} />
      <Route path="/m/chat"       element={<PhoneRoute><Chat /></PhoneRoute>} />
      <Route path="/m/submit"     element={<PhoneRoute><Submit /></PhoneRoute>} />
      <Route path="/m/rules"      element={<PhoneRoute><Rules /></PhoneRoute>} />
      <Route path="/m/talk"       element={<PhoneRoute><Talk /></PhoneRoute>} />

      <Route path="/tagesbericht" element={<Tagesbericht />} />
      <Route path="/admin"        element={<Admin />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
