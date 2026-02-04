import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/**
 * Centralized post-OAuth redirect handling.
 *
 * Why: Google OAuth + Supabase often rejects deep-link redirectTo unless
 * explicitly allow-listed. We always redirect back to site root, then navigate
 * to the intended feature stored in sessionStorage.
 */
export function AuthRedirectHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" || !session?.user) return;

      const redirectTo = sessionStorage.getItem("auth_redirect_to");
      sessionStorage.removeItem("auth_redirect_to");
      sessionStorage.removeItem("auth_modal_dismissed");

      // If we have a stored destination and we're not already there, go.
      if (!redirectTo) return;

      const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (redirectTo !== currentPath) navigate(redirectTo, { replace: true });
    });

    return () => {
      data.subscription.unsubscribe();
    };
    // Intentionally omit navigate/location from deps to avoid resubscribing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
