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

  const handleSearch = () => {
    onSearch({ destination, checkIn, checkOut, adults, children });
  };

  const totalGuests = adults + children;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.3 }}
      className="relative z-30 -mt-12 md:-mt-14 px-4"
    >
      <div className="max-w-5xl mx-auto">
        <div className="bg-card rounded-2xl shadow-xl border border-border/50 p-3 md:p-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 md:gap-0">
            {/* Destination */}
            <div className="flex-1 flex items-center gap-3 px-4 py-2 md:border-r border-border/50">
              <MapPin className="h-5 w-5 text-accent shrink-0" />
              <div className="flex-1">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Destination</p>
                <input
                  type="text"
                  placeholder="Where are you going?"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
                  style={{ fontFamily: "'Raleway', sans-serif" }}
                />
              </div>
            </div>

            {/* Check-in */}
            <div className="flex-1 md:border-r border-border/50">
              <Popover>
                <PopoverTrigger asChild>
                  <button className="w-full flex items-center gap-3 px-4 py-2 hover:bg-muted/30 rounded-lg transition-colors">
                    <Calendar className="h-5 w-5 text-accent shrink-0" />
                    <div className="text-left">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Check-in</p>
                      <p className={cn("text-sm", checkIn ? "text-foreground" : "text-muted-foreground/60")}>
                        {checkIn ? format(checkIn, 'dd MMM yyyy') : 'Select date'}
                      </p>
                    </div>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-50" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={checkIn}
                    onSelect={setCheckIn}
                    disabled={(date) => date < new Date()}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Check-out */}
            <div className="flex-1 md:border-r border-border/50">
              <Popover>
                <PopoverTrigger asChild>
                  <button className="w-full flex items-center gap-3 px-4 py-2 hover:bg-muted/30 rounded-lg transition-colors">
                    <Calendar className="h-5 w-5 text-accent shrink-0" />
                    <div className="text-left">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Check-out</p>
                      <p className={cn("text-sm", checkOut ? "text-foreground" : "text-muted-foreground/60")}>
                        {checkOut ? format(checkOut, 'dd MMM yyyy') : 'Select date'}
                      </p>
                    </div>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-50" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={checkOut}
                    onSelect={setCheckOut}
                    disabled={(date) => date < (checkIn || new Date())}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Guests */}
            <div className="flex-1">
              <Popover open={guestsOpen} onOpenChange={setGuestsOpen}>
                <PopoverTrigger asChild>
                  <button className="w-full flex items-center gap-3 px-4 py-2 hover:bg-muted/30 rounded-lg transition-colors">
                    <Users className="h-5 w-5 text-accent shrink-0" />
                    <div className="text-left">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Guests</p>
                      <p className="text-sm text-foreground">
                        {totalGuests} {totalGuests === 1 ? 'Guest' : 'Guests'}
                      </p>
                    </div>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-4 z-50" align="start">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">Adults</p>
                        <p className="text-xs text-muted-foreground">Ages 13+</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setAdults(Math.max(1, adults - 1))}
                          className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-foreground hover:bg-muted transition-colors"
                        >
                          −
                        </button>
                        <span className="text-sm font-medium w-4 text-center text-foreground">{adults}</span>
                        <button
                          onClick={() => setAdults(Math.min(10, adults + 1))}
                          className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-foreground hover:bg-muted transition-colors"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">Children</p>
                        <p className="text-xs text-muted-foreground">Ages 2–12</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setChildren(Math.max(0, children - 1))}
                          className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-foreground hover:bg-muted transition-colors"
                        >
                          −
                        </button>
                        <span className="text-sm font-medium w-4 text-center text-foreground">{children}</span>
                        <button
                          onClick={() => setChildren(Math.min(6, children + 1))}
                          className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-foreground hover:bg-muted transition-colors"
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
                className="w-full md:w-auto bg-accent hover:bg-accent/90 text-accent-foreground px-8 py-6 rounded-xl text-sm font-semibold transition-all duration-200 shadow-button"
              >
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default SearchBar;
