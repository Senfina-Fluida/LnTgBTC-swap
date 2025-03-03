import { useEffect, useState } from 'react';
import WebApp from '@twa-dev/sdk';
import { useSearchParams } from 'react-router-dom';
import SwapsTable from '../components/SwapsTable.tsx'; 

export default function Swaps() {
  const [searchParams] = useSearchParams();
  const [swaps, setSwaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    WebApp.ready();
    const params = searchParams.get('params');

    if (params) {
      try {
        const decodedParams = decodeURIComponent(params);
        const parsedSwaps = JSON.parse(decodedParams);
        setSwaps(parsedSwaps);
      } catch (err) {
        console.error("Error parsing params:", err);
        setError("Error loading swaps.");
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(false); // No params, not an error, just no data.
    }
  }, [searchParams]);
  const handleSwapSelect = (swap) => {
    if (!swap.amount || isNaN(swap.amount) || parseFloat(swap.amount) <= 0) {
      alert("Invalid Swap");
      return;
    }
    let data;
    if(swap.isOwner){
      if(swap.status === "pending"){
        data = {
          swapId: swap._id,
          action:"delete_pending_swap"
        };
      } else if(swap.status === "locked"){
        data = {
          swapId: swap._id,
          action:"refund_swap"
        };
      }
    } else {
      data = {
        swapId: swap._id,
        action:"select_swap"
      };
    };


    console.log("Data:", data);

    try {
      WebApp.sendData(JSON.stringify(data));
    } catch (error) {
      console.error("Error sending swap request:", error);
      alert("Error sending swap request. Check console.");
    }
  };
  return (
    <SwapsTable title="My Pending Swaps" swaps={swaps} handleSwapSelect={handleSwapSelect} error={error} />
  );
}
