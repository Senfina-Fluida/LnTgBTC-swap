import React from 'react';

interface Swap {
  _id?: string;
  id?: number;
  hash?: string;
  source: string;
  destiny: string;
  amount: number;
  // Add other properties as needed
}

interface PendingSwapsProps {
  title: string;
  swaps: Swap[];
  selectSwap: (swap: Swap) => void;
}

const PendingSwaps: React.FC<PendingSwapsProps> = ({ title, swaps, selectSwap }) => {
  return (
    <div className="container mx-auto p-4 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-4 text-gray-800">{title}</h1>

      {swaps.length === 0 && <p className="text-gray-600">No pending swaps.</p>}

      {swaps.length > 0 && (
        <div className="overflow-x-auto"> {/* Added for horizontal scrolling if needed */}
          <table className="table-auto w-full border-collapse border border-gray-200">
            <thead>
              <tr className="bg-gray-50 text-gray-700">
                <th className="border border-gray-200 px-4 py-2 text-left whitespace-nowrap">Source</th>
                <th className="border border-gray-200 px-4 py-2 text-left whitespace-nowrap">Destination</th>
                <th className="border border-gray-200 px-4 py-2 text-left whitespace-nowrap">Amount</th>
                <th className="border border-gray-200 px-4 py-2 whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {swaps.map((swap, index) => (
                <tr
                  key={swap._id || swap.id || swap.hash || index}
                  className="hover:bg-gray-50"
                >
                  <td className="border border-gray-200 px-4 py-2 text-gray-700">{swap.source}</td>
                  <td className="border border-gray-200 px-4 py-2 text-gray-700">{swap.destination}</td>
                  <td className="border border-gray-200 px-4 py-2 text-gray-700">{swap.amount}</td>
                  <td className="border border-gray-200 px-4 py-2 text-center">
                    <button
                      onClick={() => selectSwap(swap)}
                      className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded whitespace-nowrap"
                    >
                      Select
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PendingSwaps;