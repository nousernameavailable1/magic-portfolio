"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { routes, protectedRoutes } from "@/resources";
import { Flex, Spinner, Button, Heading, Column, PasswordInput, Text } from "@once-ui-system/core";
import NotFound from "@/app/not-found";

interface RouteGuardProps {
  children: React.ReactNode;
}

const RouteGuard: React.FC<RouteGuardProps> = ({ children }) => {
  const pathname = usePathname();
  const [isRouteEnabled, setIsRouteEnabled] = useState(false);
  const [isPasswordRequired, setIsPasswordRequired] = useState(false);
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const performChecks = async () => {
      setLoading(true);
      setIsRouteEnabled(false);
      setIsPasswordRequired(false);
      setIsAuthenticated(false);

      const checkRouteEnabled = () => {
        if (!pathname) return false;

        if (pathname in routes) {
          return routes[pathname as keyof typeof routes];
        }

        if (pathname.startsWith("/admin")) {
          return true;
        }

        const dynamicRoutes = ["/blog", "/projects"] as const;
        for (const route of dynamicRoutes) {
          if (pathname?.startsWith(route) && routes[route]) {
            return true;
          }
        }

        return false;
      };

      const routeEnabled = checkRouteEnabled();
      setIsRouteEnabled(routeEnabled);

      if (protectedRoutes[pathname as keyof typeof protectedRoutes]) {
        setIsPasswordRequired(true);

        const response = await fetch("/api/check-auth");
        if (response.ok) {
          setIsAuthenticated(true);
        }
      }

      setLoading(false);
    };

    performChecks();
  }, [pathname]);

  const handlePasswordSubmit = async () => {
    const response = await fetch("/api/authenticate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (response.ok) {
      setIsAuthenticated(true);
      setError(undefined);
    } else {
      setError("Incorrect password");
    }
  };

  if (loading) {
    return (
      <Flex fillWidth paddingY="128" horizontal="center">
        <Spinner />
      </Flex>
    );
  }

  if (!isRouteEnabled) {
    return <NotFound />;
  }

  if (isPasswordRequired && !isAuthenticated) {
    return (
      <Column fillWidth paddingY="104" horizontal="center">
        <Column
          fillWidth
          maxWidth="s"
          gap="32"
          padding="32"
          background="surface"
          border="brand-alpha-medium"
          radius="xl"
          shadow="l"
        >
          <Column gap="12" horizontal="center" align="center">
            <Heading align="center" variant="display-strong-m" wrap="balance">
              This page is for invited eyes only.
            </Heading>
            <Text align="center" variant="body-default-l" onBackground="neutral-weak">
              Enter the access password to continue.
            </Text>
          </Column>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void handlePasswordSubmit();
            }}
            style={{ width: "100%" }}
          >
            <Column fillWidth gap="16" horizontal="center">
              <PasswordInput
                id="password"
                label="Access password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                errorMessage={error}
                autoComplete="current-password"
              />
              <Button type="submit" fillWidth size="l">Unlock page</Button>
            </Column>
          </form>
          <Text align="center" variant="body-default-s" onBackground="neutral-weak">
            Don&apos;t have access? Womp womp.
          </Text>
        </Column>
      </Column>
    );
  }

  return <>{children}</>;
};

export { RouteGuard };
