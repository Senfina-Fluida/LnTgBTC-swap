import { useEffect, useState } from "react";
import WebApp from '@twa-dev/sdk';
import { useSearchParams } from 'react-router-dom';
import SwapsTable from '../components/SwapsTable.tsx';

import { Swap } from "../components/Interfaces.tsx";

const SwapRequest = () => {
  const [amount, setAmount] = useState<string>("");
  const [to, setTo] = useState<string>("Lightning");
  const [pendingSwaps, setPendingSwaps] = useState<Swap[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    WebApp.ready();
    console.log("Telegram Web App is ready!");

    const initData = searchParams.get('params');
    if (initData) {
      try {
        const data: Swap[] = JSON.parse(decodeURIComponent(initData)); // Parse the data into an array of Swap objects
        console.log("Data received from bot:", data);
        setPendingSwaps(data);
      } catch (error) {
        console.error("Error parsing initData:", error);
      }
    } else {
      console.log("No initial data received.");
    }
  }, [searchParams]);

  const handleSwapCreation = () => {
    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      alert("Please enter a valid amount.");
      return;
    }

    setIsLoading(true);

    const swapRequest = {
      source: to === "Lightning" ? "TON" : "Lightning",
      destination: to,
      amount: parsedAmount,
      action: "post_swap"
    };

    console.log("Swap Request:", swapRequest);

    try {
      WebApp.sendData(JSON.stringify(swapRequest));
    } catch (error) {
      console.error("Error sending swap request:", error);
      alert("Error sending swap request. Check console.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwapSelect = (swap: Swap) => {
    if (!swap.amount || isNaN(swap.amount) || swap.amount <= 0) {
      alert("Invalid Swap");
      return;
    }

    setIsLoading(true);

    const swapSelect = {
      swapId: swap._id,
      action: "select_swap"
    };

    console.log("Swap Select:", swapSelect);

    try {
      WebApp.sendData(JSON.stringify(swapSelect));
    } catch (error) {
      console.error("Error sending swap request:", error);
      alert("Error sending swap request. Check console.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="header">
        <h1>Swap Request</h1>
      </div>

      <div className="card">
        <div className="input-container">
          <label htmlFor="amount" className="block text-sm font-medium text-white-700 mb-1">
            Amount:
          </label>
          <input
            type="text"
            id="amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount"
          />
        </div>

        <div className="input-container">
          <label htmlFor="to" className="block text-sm font-medium text-white-700 mb-1">
            To:
          </label>
          <select
            id="to"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="block w-full px-4 py-2 text-black border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
          >
            <option value="Lightning">Lightning</option>
            <option value="TON">TON</option>
          </select>
        </div>

        <div className="input-container">
          <button
            className="button"
            onClick={handleSwapCreation}
            disabled={isLoading}
          >
            {isLoading ? "Swapping..." : "Swap"}
          </button>
        </div>
      </div>

      <div className="py-4 border-t border-gray-300 text-center">
        <span className="text-gray-500">OR</span>
      </div>

      <div className="card">
        <SwapsTable
          title="All Pending Swaps"
          swaps={pendingSwaps.filter((swap) => swap.destination !== to)}
          loading={false}
          error={null}
          handleSwapSelect={handleSwapSelect}
        />
      </div>
    </div>
  );
};

export default SwapRequest;