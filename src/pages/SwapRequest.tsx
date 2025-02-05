import { useEffect, useState } from "react";
import WebApp from '@twa-dev/sdk';
import { useSearchParams } from 'react-router-dom';
import SwapsTable from '../components/SwapsTable.tsx'; 


const SwapRequest = () => {
  const [amount, setAmount] = useState("");
  const [to, setTo] = useState("Lightning");
  const [pendingSwaps, setPendingSwaps] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams] = useSearchParams();


  useEffect(() => {
    WebApp.ready();
    console.log("Telegram Web App is ready!");

    const initData = searchParams.get('params');
    if (initData) {
      try {
        const data = JSON.parse(decodeURIComponent(initData)); // If you used JSON.stringify() on the bot side
        console.log("Data received from bot:", data);
        setPendingSwaps(data);
        // Use the data in your Web App
      } catch (error) {
        console.error("Error parsing initData:", error);
      }
    } else {
      console.log("No initial data received.");
    }
  },[]);

  const handleSwapCreation = () => {
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      alert("Please enter a valid amount.");
      return;
    }

    setIsLoading(true);

    const swapRequest = {
      source: to === "Lightning" ? "TON" : "Lightning",
      destination: to,
      amount: parseFloat(amount),
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
  const handleSwapSelect = (swap) => {
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      alert("Please enter a valid amount.");
      return;
    }

    setIsLoading(true);

    const swapSelect = {
      swapId: swap.id,
      type:"selection"
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
      <div className="header"> {/* Added header div */}
        <h1>Swap Request</h1>
      </div>

      <div className="card"> {/* Wrapped in card div */}
        <div className="input-container"> {/* Wrapped inputs in input-container */}
          <label htmlFor="amount" className="block text-sm font-medium text-white-700 mb-1">Amount:</label>
          <input
            type="text"
            id="amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount"
          />
        </div>

        <div className="input-container">
          <label htmlFor="to" className="block text-sm font-medium text-white-700 mb-1"> {/* Label styling */}
            To:
          </label>  
          <select
              id="to"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="block w-full px-4 py-2 text-black border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm" // Select styling
            >
              <option value="Lightning">Lightning</option>
              <option value="TON">TON</option>
          </select>
        </div>
        <div className="input-container">
          <button className="button" onClick={handleSwapCreation} disabled={isLoading}> {/* Added button class */}
            {isLoading ? "Swapping..." : "Swap"}
          </button>
        </div>
      </div> {/* Close card div */}
      <div className="py-4 border-t border-gray-300 text-center"> {/* Separator */}
        <span className="text-gray-500">OR</span>
      </div>
      <div className="card">
          <SwapsTable title="All Pending Swaps" swaps={pendingSwaps} loading={false} error={false} />
      </div>
    </div>
  );
};

export default SwapRequest;