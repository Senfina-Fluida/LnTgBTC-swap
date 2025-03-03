import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import SwapRequest from "./pages/SwapRequest.tsx";

import Swaps from "./pages/Swaps.tsx";
import PerformSwap from "./pages/PerformSwap.tsx";

import { TonConnectUIProvider, THEME } from "@tonconnect/ui-react";
import { BrowserRouter,Routes,Route } from 'react-router-dom';
import "./App.css";


createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <TonConnectUIProvider
      uiPreferences={{ theme: THEME.DARK }}
      manifestUrl="https://tonxapi.com/tonconnect-manifest.json"
    >
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<SwapRequest/>} />
          <Route path="/startSwap" element={<PerformSwap/>} />

          <Route path="/swaps" element={<Swaps/>} />
        </Routes>
      </BrowserRouter>
    </TonConnectUIProvider>
  </StrictMode>
);
