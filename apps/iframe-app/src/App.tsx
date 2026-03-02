import { Navigate, Route, Routes } from "react-router-dom";
import { DetailPage } from "./components/DetailPage";
import { ListPage } from "./components/ListPage";

export function App() {
  return (
    <Routes>
      <Route path="/list" element={<ListPage />} />
      <Route path="/detail/:itemId" element={<DetailPage />} />
      <Route path="*" element={<Navigate to="/list" replace />} />
    </Routes>
  );
}
