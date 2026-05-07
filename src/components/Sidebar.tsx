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
    <div className="fixed left-0 top-0 h-screen w-[72px] glass-panel-heavy border-r border-white/5 flex flex-col items-center py-6 gap-6 z-40 transition-all duration-300">
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
          className="w-10 h-10 rounded-xl text-white/70 hover:text-white hover:bg-white/10 hover:shadow-[0_0_15px_rgba(255,255,255,0.2)] transition-all duration-300 relative group"
        >
          <div className="flex items-center justify-center text-xl group-hover:scale-110 transition-transform duration-300">+</div>
          {/* Tooltip hint */}
          <div className="absolute left-14 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
            Toggle History
          </div>
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
            className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-1 transition-all duration-300 group relative ${item.active
              ? "bg-primary/20 text-primary shadow-[0_0_20px_rgba(251,191,36,0.2)]"
              : "text-white/60 hover:text-white hover:bg-white/10"
              }`}
          >
            <item.icon className={`w-5 h-5 transition-transform duration-300 ${item.active ? 'scale-110' : 'group-hover:scale-110'}`} />
            <div className="absolute left-14 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
              {item.label}
            </div>
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
