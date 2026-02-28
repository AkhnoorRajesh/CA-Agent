import { Home } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import caLogo from "@/assets/ca-logo.jpg";
import caLogoAnimation from "@/assets/ca-logo-animation.mp4";
import ProfileDropdown from "./ProfileDropdown";
import { useState } from "react";

interface SidebarProps {
  onToggleChatHistory?: () => void;
}

const Sidebar = ({ onToggleChatHistory }: SidebarProps) => {
  const navigate = useNavigate();
  const [showLogoAnimation, setShowLogoAnimation] = useState(false);
  
  const menuItems = [
    { icon: Home, label: "Home", active: true, path: "/" },
  ];

  return (
    <div className="fixed left-0 top-0 h-screen w-16 bg-sidebar border-r border-sidebar-border flex flex-col items-center py-6 gap-6">
      {/* Logo */}
      <div 
        className="w-10 h-10 flex items-center justify-center group cursor-pointer"
        onClick={() => setShowLogoAnimation(true)}
      >
        <div className="relative w-10 h-10 rounded-lg overflow-hidden">
          <img src={caLogo} alt="CA Logo" className="w-full h-full object-cover transition-all duration-300" />
          <div className="absolute inset-0 bg-blue-500 opacity-0 group-hover:opacity-70 transition-opacity duration-300 mix-blend-multiply"></div>
        </div>
      </div>

      {/* Logo Animation Dialog */}
      <Dialog open={showLogoAnimation} onOpenChange={setShowLogoAnimation}>
        <DialogContent className="max-w-md">
          <video 
            autoPlay 
            loop 
            muted 
            className="w-full h-auto rounded-lg"
          >
            <source src={caLogoAnimation} type="video/mp4" />
          </video>
        </DialogContent>
      </Dialog>

      {/* Add New */}
      {onToggleChatHistory && (
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onToggleChatHistory}
          className="text-sidebar-foreground hover:text-accent hover:bg-sidebar-accent"
        >
          <div className="w-6 h-6 flex items-center justify-center text-xl">+</div>
        </Button>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Main Menu Items */}
      <div className="flex flex-col gap-6">
        {menuItems.map((item) => (
          <Button
            key={item.label}
            variant="ghost"
            size="icon"
            onClick={() => navigate(item.path)}
            className={`flex flex-col items-center gap-1 h-auto py-2 ${
              item.active
                ? "text-accent"
                : "text-sidebar-foreground hover:text-accent hover:bg-sidebar-accent"
            }`}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[10px]">{item.label}</span>
          </Button>
        ))}
      </div>

      {/* Bottom Items */}
      <div className="flex flex-col gap-4 pt-4 border-t border-sidebar-border">
        <ProfileDropdown />
      </div>
    </div>
  );
};

export default Sidebar;
