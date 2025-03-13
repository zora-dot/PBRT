import React from 'react';
import { Plus, Minus } from 'lucide-react';

interface DiffViewerProps {
  oldCode: string;
  newCode: string;
  language?: string;
}

export default function DiffViewer({ oldCode, newCode, language = 'javascript' }: DiffViewerProps) {
  const oldLines = oldCode.split('\n');
  const newLines = newCode.split('\n');

  // Simple diff algorithm
  const diff = [];
  let i = 0;
  let j = 0;

  while (i < oldLines.length || j < newLines.length) {
    if (i >= oldLines.length) {
      // Rest of newLines are additions
      diff.push({ type: 'add', content: newLines[j], number: j + 1 });
      j++;
    } else if (j >= newLines.length) {
      // Rest of oldLines are deletions
      diff.push({ type: 'remove', content: oldLines[i], number: i + 1 });
      i++;
    } else if (oldLines[i] === newLines[j]) {
      // Lines are the same
      diff.push({ type: 'same', content: oldLines[i], number: i + 1 });
      i++;
      j++;
    } else {
      // Lines are different
      diff.push({ type: 'remove', content: oldLines[i], number: i + 1 });
      diff.push({ type: 'add', content: newLines[j], number: j + 1 });
      i++;
      j++;
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Code Changes</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <tbody className="font-mono">
            {diff.map((line, index) => (
              <tr 
                key={index}
                className={`
                  ${line.type === 'add' ? 'bg-green-50' : ''}
                  ${line.type === 'remove' ? 'bg-red-50' : ''}
                  hover:bg-gray-50
                `}
              >
                <td className="py-1 pl-4 pr-2 text-gray-500 select-none w-12 text-right">
                  {line.number}
                </td>
                <td className="py-1 px-2 select-none w-6">
                  {line.type === 'add' && <Plus className="w-4 h-4 text-green-600" />}
                  {line.type === 'remove' && <Minus className="w-4 h-4 text-red-600" />}
                </td>
                <td className="py-1 pl-2 pr-4 whitespace-pre">
                  <span className={`
                    ${line.type === 'add' ? 'text-green-700' : ''}
                    ${line.type === 'remove' ? 'text-red-700' : ''}
                  `}>
                    {line.content}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}