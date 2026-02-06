import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/**
 * Centralized post-OAuth redirect handling.
 *
 * Why: Google OAuth returns tokens in a URL hash fragment (#access_token=...).
 * Supabase auto-parses this, but we must:
 * 1) Ensure getSession() is called after Supabase parses the hash.
 * 2) Clean the URL so hash doesn't persist and confuse future navigations.
 * 3) Navigate to the stored destination (auth_redirect_to).
 */
export function AuthRedirectHandler() {
  const navigate = useNavigate();
  const location = useLocation();
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Only run once per mount to avoid loops
    if (hasProcessed.current) return;

    const hash = window.location.hash;
    const isOAuthCallback = hash.includes("access_token") || hash.includes("error");

    if (isOAuthCallback) {
      hasProcessed.current = true;

      // Give Supabase a moment to parse the hash and set session
      const processOAuth = async () => {
        // Supabase client auto-detects hash and stores session;
        // calling getSession forces it to finalize.
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error("OAuth session error:", error);
        }

        // Clean the hash from URL so it doesn't re-trigger
        window.history.replaceState(null, "", window.location.pathname + window.location.search);

        if (session?.user) {
          const redirectTo = sessionStorage.getItem("auth_redirect_to") || "/";
          sessionStorage.removeItem("auth_redirect_to");
          sessionStorage.removeItem("auth_modal_dismissed");
          navigate(redirectTo, { replace: true });
        }
      };

      processOAuth();
    }
  }, [location, navigate]);

  // Also listen for auth state changes for non-hash scenarios
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" || !session?.user) return;

      const redirectTo = sessionStorage.getItem("auth_redirect_to");
      if (!redirectTo) return;

      sessionStorage.removeItem("auth_redirect_to");
      sessionStorage.removeItem("auth_modal_dismissed");

      const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (redirectTo !== currentPath) {
        navigate(redirectTo, { replace: true });
      }
    });

    return () => {
      data.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
