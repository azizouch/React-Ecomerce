import React, { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, Search, X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface Client {
  id: string;
  nom: string;
  telephone?: string;
}

interface ClientComboboxProps {
  clients: Client[];
  value?: string;
  onValueChange: (value: string) => void;
  onNewClientClick: () => void;
  placeholder?: string;
  className?: string;
}

export function ClientCombobox({
  clients,
  value,
  onValueChange,
  onNewClientClick,
  placeholder = "Rechercher un client...",
  className
}: ClientComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [displayValue, setDisplayValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Update display value when value changes
  useEffect(() => {
    if (value) {
      const selectedClient = clients.find(client => client.id === value);
      if (selectedClient) {
        setDisplayValue(selectedClient.nom);
        setSearch(selectedClient.nom);
      }
    } else {
      setDisplayValue('');
      setSearch('');
    }
  }, [value, clients]);

  // Filter clients based on search
  const filteredClients = clients.filter(client =>
    client.nom.toLowerCase().includes(search.toLowerCase()) ||
    (client.telephone && client.telephone.includes(search))
  );

  // Handle input focus
  const handleInputFocus = () => {
    setOpen(true);
    setSearch('');
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearch(newValue);
    setDisplayValue(newValue);
    setOpen(true);
  };

  // Handle client selection
  const handleClientSelect = (client: Client) => {
    onValueChange(client.id);
    setDisplayValue(client.nom);
    setSearch(client.nom);
    setOpen(false);
  };

  // Handle clear
  const handleClear = () => {
    onValueChange('');
    setDisplayValue('');
    setSearch('');
    setOpen(false);
    inputRef.current?.focus();
  };

  // Handle dropdown toggle
  const handleDropdownToggle = () => {
    if (open) {
      setOpen(false);
      if (value) {
        const selectedClient = clients.find(client => client.id === value);
        if (selectedClient) {
          setDisplayValue(selectedClient.nom);
          setSearch(selectedClient.nom);
        }
      } else {
        setDisplayValue('');
        setSearch('');
      }
    } else {
      setOpen(true);
      setSearch('');
      inputRef.current?.focus();
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
        if (value) {
          const selectedClient = clients.find(client => client.id === value);
          if (selectedClient) {
            setDisplayValue(selectedClient.nom);
            setSearch(selectedClient.nom);
          }
        } else {
          setDisplayValue('');
          setSearch('');
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [value, clients]);

  return (
    <div ref={dropdownRef} className={cn("relative", className)}>
      {/* Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={open ? search : displayValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          className="pl-10 pr-20"
        />
        <div className="absolute right-1 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
          {(search || displayValue) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleDropdownToggle}
            className="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
          </Button>
        </div>
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-64 overflow-auto">
          {filteredClients.length > 0 ? (
            <>
              {filteredClients.map((client) => (
                <div
                  key={client.id}
                  className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer flex items-center justify-between"
                  onClick={() => handleClientSelect(client)}
                >
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{client.nom}</div>
                    {client.telephone && (
                      <div className="text-sm text-gray-500 dark:text-gray-400">{client.telephone}</div>
                    )}
                  </div>
                  {value === client.id && (
                    <Check className="h-4 w-4 text-blue-600" />
                  )}
                </div>
              ))}
              <div className="border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onNewClientClick();
                    setOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-700 dark:text-gray-300"
                >
                  <Plus className="h-4 w-4" />
                  Ajouter un nouveau client
                </button>
              </div>
            </>
          ) : (
            <div className="p-3">
              <div className="text-gray-500 dark:text-gray-400 text-center py-2">
                Aucun client trouvé
              </div>
              <button
                type="button"
                onClick={() => {
                  onNewClientClick();
                  setOpen(false);
                }}
                className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-700 dark:text-gray-300 border-t border-gray-200 dark:border-gray-700"
              >
                <Plus className="h-4 w-4" />
                Ajouter un nouveau client
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
