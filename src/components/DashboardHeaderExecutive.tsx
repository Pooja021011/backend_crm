import { Search, User } from "lucide-react";
import { Input } from "@/components/ui/input";

export const DashboardHeaderExecutive = () => {
  return (
    <header className="border-b border-white/20 sticky top-0 z-50 backdrop-blur-xl bg-white/5">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Search bar */}
          <div className="flex-1 max-w-xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search leads, properties..."
                className="pl-9 pr-3 py-2 w-full bg-white/10 border border-white/20 rounded-lg text-sm placeholder:text-muted-foreground focus:bg-white/20 focus:border-primary/50"
              />
            </div>
          </div>

          {/* Profile icon */}
          <button className="h-9 w-9 bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex items-center justify-center">
            <User className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>
    </header>
  );
};