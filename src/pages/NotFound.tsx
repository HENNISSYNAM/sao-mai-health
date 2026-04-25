import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Home, ArrowLeft, LayoutDashboard, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isVi = i18n.language === "vi";

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center max-w-md">
        <p className="text-7xl font-bold text-primary/20 mb-2 select-none">404</p>
        <h1 className="text-2xl font-semibold text-foreground mb-2">
          {isVi ? "Không tìm thấy trang" : "Page not found"}
        </h1>
        <p className="text-muted-foreground mb-8 text-sm">
          {isVi
            ? `Đường dẫn "${location.pathname}" không tồn tại hoặc đã bị xóa.`
            : `The path "${location.pathname}" does not exist or has been removed.`}
        </p>

        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Button variant="outline" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            {isVi ? "Quay lại" : "Go back"}
          </Button>
          <Button onClick={() => navigate("/dashboard")} className="gap-2">
            <LayoutDashboard className="h-4 w-4" />
            {isVi ? "Trang chủ" : "Dashboard"}
          </Button>
          <Button variant="ghost" onClick={() => navigate("/help")} className="gap-2">
            <HelpCircle className="h-4 w-4" />
            {isVi ? "Trợ giúp" : "Help"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
