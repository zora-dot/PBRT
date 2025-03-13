import React from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface User {
  id: string;
  username: string;
  avatar_url: string | null;
}

interface UserListPopoverProps {
  users: User[];
  title: string;
  isOpen: boolean;
  onClose: () => void;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
}

export default function UserListPopover({ 
  users, 
  title, 
  isOpen, 
  onClose,
  currentPage = 1,
  totalPages = 1,
  onPageChange
}: UserListPopoverProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50"
            onClick={onClose}
          />

          {/* Popover */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl w-full max-w-md z-50"
          >
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {users.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  No users yet
                </div>
              ) : (
                <div className="divide-y">
                  {users.map((user) => (
                    <Link
                      key={user.id}
                      to={`/profile/${user.username}`}
                      className="flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors"
                      onClick={onClose}
                    >
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt={user.username}
                          className="w-10 h-10 rounded-full"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                          <span className="text-primary-600 font-medium">
                            {user.username[0].toUpperCase()}
                          </span>
                        </div>
                      )}
                      <span className="font-medium text-gray-900">
                        {user.username}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 p-4 border-t">
              <button
                onClick={() => onPageChange?.(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => onPageChange?.(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}