import { useState } from 'react';
import { MapPin, Calendar, Users, Search } from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface SearchFilters {
  destination: string;
  checkIn: Date | undefined;
  checkOut: Date | undefined;
  adults: number;
  children: number;
}

interface SearchBarProps {
  onSearch: (filters: SearchFilters) => void;
}

const SearchBar = ({ onSearch }: SearchBarProps) => {
  const [destination, setDestination] = useState('');
  const [checkIn, setCheckIn] = useState<Date | undefined>();
  const [checkOut, setCheckOut] = useState<Date | undefined>();
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [guestsOpen, setGuestsOpen] = useState(false);
  const [validationError, setValidationError] = useState('');

  const handleSearch = () => {
    if (!destination.trim() || !checkIn || !checkOut) {
      setValidationError('Please fill in all search details.');
      return;
    }

    setValidationError('');
    onSearch({ destination, checkIn, checkOut, adults, children });
  };

  const totalGuests = adults + children;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.3 }}
      className="relative z-30 py-8 px-4"
    >
      <div className="max-w-5xl mx-auto">
        <div className="bg-[#1f1f2e]/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/10 p-4 md:p-5">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 md:gap-0">
            {/* Destination */}
            <div className="flex-1 flex items-center gap-3 px-4 py-3 bg-[#2d2d3d]/45 rounded-2xl border border-white/5 md:bg-transparent md:border-0 md:rounded-none md:border-r border-white/10 hover:bg-white/[0.02] transition-all duration-200">
              <MapPin className="h-5 w-5 text-[hsl(var(--cyan-accent))] shrink-0" />
              <div className="flex-1">
                <p className="text-[9px] uppercase tracking-wider text-gray-400 font-bold">Destination</p>
                <input
                  type="text"
                  placeholder="Where are you going?"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full bg-transparent text-sm text-white placeholder:text-gray-500 focus:outline-none mt-0.5"
                  style={{ fontFamily: "'Raleway', sans-serif" }}
                />
              </div>
            </div>

            {/* Check-in */}
            <div className="flex-1 bg-[#2d2d3d]/45 rounded-2xl border border-white/5 md:bg-transparent md:border-0 md:rounded-none md:border-r border-white/10 hover:bg-white/[0.02] transition-all duration-200">
              <Popover>
                <PopoverTrigger asChild>
                  <button className="w-full flex items-center gap-3 px-4 py-3 text-left">
                    <Calendar className="h-5 w-5 text-[hsl(var(--cyan-accent))] shrink-0" />
                    <div>
                      <p className="text-[9px] uppercase tracking-wider text-gray-400 font-bold">Check-in</p>
                      <p className={cn("text-sm mt-0.5 font-semibold", checkIn ? "text-white" : "text-gray-500")}>
                        {checkIn ? format(checkIn, 'dd MMM yyyy') : 'Select date'}
                      </p>
                    </div>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-50 bg-[#1f1f2e] border-white/10 text-white rounded-2xl shadow-xl" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={checkIn}
                    onSelect={setCheckIn}
                    disabled={(date) => date < new Date()}
                    initialFocus
                    className={cn("p-3 pointer-events-auto bg-[#1f1f2e] text-white border-0")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Check-out */}
            <div className="flex-1 bg-[#2d2d3d]/45 rounded-2xl border border-white/5 md:bg-transparent md:border-0 md:rounded-none md:border-r border-white/10 hover:bg-white/[0.02] transition-all duration-200">
              <Popover>
                <PopoverTrigger asChild>
                  <button className="w-full flex items-center gap-3 px-4 py-3 text-left">
                    <Calendar className="h-5 w-5 text-[hsl(var(--cyan-accent))] shrink-0" />
                    <div>
                      <p className="text-[9px] uppercase tracking-wider text-gray-400 font-bold">Check-out</p>
                      <p className={cn("text-sm mt-0.5 font-semibold", checkOut ? "text-white" : "text-gray-500")}>
                        {checkOut ? format(checkOut, 'dd MMM yyyy') : 'Select date'}
                      </p>
                    </div>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-50 bg-[#1f1f2e] border-white/10 text-white rounded-2xl shadow-xl" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={checkOut}
                    onSelect={setCheckOut}
                    disabled={(date) => date < (checkIn || new Date())}
                    initialFocus
                    className={cn("p-3 pointer-events-auto bg-[#1f1f2e] text-white border-0")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Guests */}
            <div className="flex-1 bg-[#2d2d3d]/45 rounded-2xl border border-white/5 md:bg-transparent md:border-0 md:rounded-none hover:bg-white/[0.02] transition-all duration-200">
              <Popover open={guestsOpen} onOpenChange={setGuestsOpen}>
                <PopoverTrigger asChild>
                  <button className="w-full flex items-center gap-3 px-4 py-3 text-left">
                    <Users className="h-5 w-5 text-[hsl(var(--cyan-accent))] shrink-0" />
                    <div>
                      <p className="text-[9px] uppercase tracking-wider text-gray-400 font-bold">Guests</p>
                      <p className="text-sm mt-0.5 font-semibold text-white">
                        {totalGuests} {totalGuests === 1 ? 'Guest' : 'Guests'}
                      </p>
                    </div>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-4 z-50 bg-[#1f1f2e] border border-white/10 text-white rounded-2xl shadow-xl" align="start">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-white">Adults</p>
                        <p className="text-xs text-gray-400">Ages 13+</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setAdults(Math.max(1, adults - 1))}
                          className="w-8 h-8 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
                        >
                          −
                        </button>
                        <span className="text-sm font-semibold w-4 text-center text-white">{adults}</span>
                        <button
                          onClick={() => setAdults(Math.min(10, adults + 1))}
                          className="w-8 h-8 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-white">Children</p>
                        <p className="text-xs text-gray-400">Ages 2–12</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setChildren(Math.max(0, children - 1))}
                          className="w-8 h-8 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
                        >
                          −
                        </button>
                        <span className="text-sm font-semibold w-4 text-center text-white">{children}</span>
                        <button
                          onClick={() => setChildren(Math.min(6, children + 1))}
                          className="w-8 h-8 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Search Button */}
            <div className="md:pl-3">
              <Button
                onClick={handleSearch}
                className="w-full md:w-auto bg-[hsl(var(--cyan-accent))] hover:bg-[hsl(var(--cyan-accent))]/90 text-[#131326] px-8 py-6 rounded-2xl text-sm font-bold transition-all duration-200 shadow-lg active:scale-[0.98]"
              >
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>
          </div>
          {validationError && (
            <p className="mt-3 px-2 text-sm text-red-400 font-semibold" role="alert" aria-live="polite">
              {validationError}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default SearchBar;
