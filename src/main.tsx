import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import SwapRequest from "./pages/SwapRequest.tsx";

import MyPendingSwaps from "./pages/MyPendingSwaps.tsx";
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

          <Route path="/myPendingSwaps" element={<MyPendingSwaps/>} />
        </Routes>
      </BrowserRouter>
    </TonConnectUIProvider>
  </StrictMode>
);
