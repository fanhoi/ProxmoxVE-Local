"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useAuth } from "./AuthProvider";
import { Lock, User, AlertCircle } from "lucide-react";
import { useRegisterModal, ModalPortal } from "./modal/ModalStackProvider";

interface AuthModalProps {
  isOpen: boolean;
}

// Этот компонент отображает модальное окно входа (авторизации) пользователя.
export function AuthModal({ isOpen }: AuthModalProps) {
  const zIndex = useRegisterModal(isOpen, {
    id: "auth-modal",
    allowEscape: false,
    onClose: () => null,
  });
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const success = await login(username, password);

    if (!success) {
      setError("Неверное имя пользователя или пароль");
    }

    setIsLoading(false);
  };

  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
        style={{ zIndex }}
      >
        <div className="bg-card border-border w-full max-w-md rounded-lg border shadow-xl">
          {/* Header */}
          <div className="border-border flex items-center justify-center border-b p-6">
            <div className="flex items-center gap-3">
              <Lock className="text-primary h-8 w-8" />
              <h2 className="text-card-foreground text-2xl font-bold">
                Требуется авторизация
              </h2>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <p className="text-muted-foreground mb-6 text-center">
              Пожалуйста, введите свои учетные данные для доступа к приложению.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="username"
                  className="text-foreground mb-2 block text-sm font-medium"
                >
                  Имя пользователя
                </label>
                <div className="relative">
                  <User className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="Введите имя пользователя"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={isLoading}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="text-foreground mb-2 block text-sm font-medium"
                >
                  Пароль
                </label>
                <div className="relative">
                  <Lock className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Введите пароль"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="bg-error/10 text-error-foreground border-error/20 flex items-center gap-2 rounded-md border p-3">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading || !username.trim() || !password.trim()}
                className="w-full"
              >
                {isLoading ? "Вход в систему..." : "Войти"}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
