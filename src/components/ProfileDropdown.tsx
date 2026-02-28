import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";

const ProfileDropdown = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleAccountClick = () => {
    setOpen(false);
    navigate("/account");
  };

  const handleSignOut = async () => {
    setOpen(false);
    await signOut();
  };

  const username = user?.email?.split("@")[0] || "User";

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-sidebar-foreground hover:text-accent hover:bg-sidebar-accent"
        >
          <User className="w-5 h-5" />
          <div className="absolute top-1 right-1 w-2 h-2 bg-accent rounded-full"></div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        side="right"
        className="w-56 bg-popover border-border"
      >
        <DropdownMenuItem
          className="flex items-center gap-3 py-3 cursor-pointer"
          onClick={handleAccountClick}
        >
          <User className="w-4 h-4" />
          <span className="font-medium">{username}</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="flex items-center gap-3 py-2 cursor-pointer text-destructive focus:text-destructive"
          onClick={handleSignOut}
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ProfileDropdown;
