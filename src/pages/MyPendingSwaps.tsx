import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import SwapsTable from '../components/SwapsTable.tsx'; 

export default function MyPendingSwaps() {
  const [searchParams] = useSearchParams();
  const [swaps, setSwaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
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

  return (
    <SwapsTable title="My Pending Swaps" swaps={swaps} loading={loading} error={error} />
  );
}
