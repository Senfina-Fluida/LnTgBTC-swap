import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import SwapRequest from "./pages/SwapRequest.tsx";

import Swaps from "./pages/Swaps.tsx";
import PerformSwap from "./pages/PerformSwap.tsx";
import RefundSwap from "./pages/RefundSwap.tsx";

import { TonConnectUIProvider, THEME } from "@tonconnect/ui-react";
import { HashRouter,Routes,Route } from 'react-router-dom';
import "./App.css";


createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <TonConnectUIProvider
      uiPreferences={{ theme: THEME.DARK }}
      manifestUrl="https://tonxapi.com/tonconnect-manifest.json"
    >
      <HashRouter>
        <Routes>
          <Route path="/" element={<SwapRequest/>} />
          <Route path="/startSwap" element={<PerformSwap/>} />
          <Route path="/swaps" element={<Swaps/>} />
          <Route path="/refundSwap" element={<RefundSwap/>} />
        </Routes>
      </HashRouter>
    </TonConnectUIProvider>
  </StrictMode>
);
