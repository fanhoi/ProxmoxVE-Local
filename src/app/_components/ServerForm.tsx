"use client";

import { useState, useEffect } from "react";
import type { CreateServerData } from "../../types/server";
import { Button } from "./ui/button";
import { SSHKeyInput } from "./SSHKeyInput";
import { PublicKeyModal } from "./PublicKeyModal";
import { Key } from "lucide-react";

interface ServerFormProps {
  onSubmit: (data: CreateServerData) => void;
  initialData?: CreateServerData;
  isEditing?: boolean;
  onCancel?: () => void;
}

// Этот компонент отображает форму добавления или редактирования конфигурации сервера Proxmox VE.
export function ServerForm({
  onSubmit,
  initialData,
  isEditing = false,
  onCancel,
}: ServerFormProps) {
  const [formData, setFormData] = useState<CreateServerData>(
    initialData ?? {
      name: "",
      ip: "",
      user: "",
      password: "",
      auth_type: "password",
      ssh_key: "",
      ssh_key_passphrase: "",
      ssh_port: 22,
      color: "#3b82f6",
    },
  );

  const [errors, setErrors] = useState<
    Partial<Record<keyof CreateServerData, string>>
  >({});
  const [sshKeyError, setSshKeyError] = useState<string>("");
  const [colorCodingEnabled, setColorCodingEnabled] = useState(false);
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);
  const [showPublicKeyModal, setShowPublicKeyModal] = useState(false);
  const [generatedPublicKey, setGeneratedPublicKey] = useState("");
  const [, setIsGeneratedKey] = useState(false);
  const [, setGeneratedServerId] = useState<number | null>(null);

  useEffect(() => {
    const loadColorCodingSetting = async () => {
      try {
        const response = await fetch("/api/settings/color-coding");
        if (response.ok) {
          const data = await response.json();
          setColorCodingEnabled(Boolean(data.enabled));
        }
      } catch (error) {
        console.error("Error loading color coding setting:", error);
      }
    };
    void loadColorCodingSetting();
  }, []);

  const validateServerAddress = (address: string): boolean => {
    const trimmed = address.trim();
    if (!trimmed) return false;

    // IPv4 validation
    const ipv4Regex =
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (ipv4Regex.test(trimmed)) {
      return true;
    }

    // Check for IPv6 with zone identifier (link-local addresses like fe80::...%eth0)
    let ipv6Address = trimmed;
    const zoneIdMatch = /^(.+)%([a-zA-Z0-9_\-]+)$/.exec(trimmed);
    if (zoneIdMatch?.[1] && zoneIdMatch[2]) {
      ipv6Address = zoneIdMatch[1];
      // Zone identifier should be a valid interface name (alphanumeric, underscore, hyphen)
      const zoneId = zoneIdMatch[2];
      if (!/^[a-zA-Z0-9_\-]+$/.test(zoneId)) {
        return false;
      }
    }

    // IPv6 validation (supports compressed format like ::1 and full format)
    // Matches: 2001:0db8:85a3:0000:0000:8a2e:0370:7334, ::1, 2001:db8::1, etc.
    // Also supports IPv4-mapped IPv6 addresses like ::ffff:192.168.1.1
    // Simplified validation: check for valid hex segments separated by colons
    const ipv6Pattern =
      /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$|^(?:[0-9a-fA-F]{1,4}:)*::(?:[0-9a-fA-F]{1,4}:)*[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:)*::[0-9a-fA-F]{1,4}$|^::(?:[0-9a-fA-F]{1,4}:)+[0-9a-fA-F]{1,4}$|^::ffff:(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^(?:[0-9a-fA-F]{1,4}:){1,4}:(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (ipv6Pattern.test(ipv6Address)) {
      // Additional validation: ensure only one :: compression exists
      const compressionCount = (ipv6Address.match(/::/g) ?? []).length;
      if (compressionCount <= 1) {
        return true;
      }
    }

    // FQDN/hostname validation (RFC 1123 compliant)
    // Allows letters, numbers, hyphens, dots; must start and end with alphanumeric
    // Max length 253 characters, each label max 63 characters
    const hostnameRegex =
      /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?$/;
    if (hostnameRegex.test(trimmed) && trimmed.length <= 253) {
      // Additional check: each label (between dots) must be max 63 chars
      const labels = trimmed.split(".");
      if (labels.every((label) => label.length > 0 && label.length <= 63)) {
        return true;
      }
    }

    // Also allow simple hostnames without dots (like 'localhost')
    const simpleHostnameRegex =
      /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?$/;
    if (simpleHostnameRegex.test(trimmed) && trimmed.length <= 63) {
      return true;
    }

    return false;
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof CreateServerData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Имя сервера обязательно для заполнения";
    }

    if (!formData.ip.trim()) {
      newErrors.ip = "Адрес сервера обязателен для заполнения";
    } else {
      if (!validateServerAddress(formData.ip)) {
        newErrors.ip =
          "Введите корректный IP-адрес (IPv4/IPv6) или имя хоста";
      }
    }

    if (!formData.user.trim()) {
      newErrors.user = "Имя пользователя обязательно для заполнения";
    }

    // Validate SSH port
    if (
      formData.ssh_port !== undefined &&
      (formData.ssh_port < 1 || formData.ssh_port > 65535)
    ) {
      newErrors.ssh_port = "Порт SSH должен быть в диапазоне от 1 до 65535";
    }

    // Validate authentication based on auth_type
    const authType = formData.auth_type ?? "password";

    if (authType === "password") {
      if (!formData.password?.trim()) {
        newErrors.password = "Пароль обязателен для авторизации по паролю";
      }
    }

    if (authType === "key") {
      if (!formData.ssh_key?.trim()) {
        newErrors.ssh_key = "SSH-ключ обязателен для авторизации по ключу";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0 && !sshKeyError;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
      if (!isEditing) {
        setFormData({
          name: "",
          ip: "",
          user: "",
          password: "",
          auth_type: "password",
          ssh_key: "",
          ssh_key_passphrase: "",
          ssh_port: 22,
          color: "#3b82f6",
        });
      }
    }
  };

  const handleChange =
    (field: keyof CreateServerData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      // Special handling for numeric ssh_port: keep it strictly numeric
      if (field === "ssh_port") {
        const raw = (e.target as HTMLInputElement).value ?? "";
        const digitsOnly = raw.replace(/\D+/g, "");
        setFormData((prev) => ({
          ...prev,
          ssh_port: digitsOnly ? parseInt(digitsOnly, 10) : undefined,
        }));
        if (errors.ssh_port) {
          setErrors((prev) => ({ ...prev, ssh_port: undefined }));
        }
        return;
      }

      setFormData((prev) => ({
        ...prev,
        [field]: (e.target as HTMLInputElement).value,
      }));
      // Clear error when user starts typing
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: undefined }));
      }

      // Reset generated key state when switching auth types
      if (field === "auth_type") {
        setIsGeneratedKey(false);
        setGeneratedPublicKey("");
      }
    };

  const handleGenerateKeyPair = async () => {
    setIsGeneratingKey(true);
    try {
      const response = await fetch("/api/servers/generate-keypair", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Не удалось сгенерировать пару ключей");
      }

      const data = (await response.json()) as {
        success: boolean;
        privateKey?: string;
        publicKey?: string;
        serverId?: number;
        error?: string;
      };

      if (data.success) {
        const serverId = data.serverId ?? 0;
        const keyPath = `data/ssh-keys/server_${serverId}_key`;

        setFormData((prev) => ({
          ...prev,
          ssh_key: data.privateKey ?? "",
          ssh_key_path: keyPath,
          key_generated: true,
        }));
        setGeneratedPublicKey(data.publicKey ?? "");
        setGeneratedServerId(serverId);
        setIsGeneratedKey(true);
        setShowPublicKeyModal(true);
        setSshKeyError("");
      } else {
        throw new Error(data.error ?? "Не удалось сгенерировать пару ключей");
      }
    } catch (error) {
      console.error("Error generating key pair:", error);
      setSshKeyError(
        error instanceof Error ? error.message : "Не удалось сгенерировать пару ключей",
      );
    } finally {
      setIsGeneratingKey(false);
    }
  };

  const handleSSHKeyChange = (value: string) => {
    setFormData((prev) => ({ ...prev, ssh_key: value }));
    if (errors.ssh_key) {
      setErrors((prev) => ({ ...prev, ssh_key: undefined }));
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="name"
              className="text-muted-foreground mb-1 block text-sm font-medium"
            >
              Имя сервера *
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={handleChange("name")}
              className={`bg-card text-foreground placeholder-muted-foreground focus:ring-ring focus:border-ring w-full rounded-md border px-3 py-2 shadow-sm focus:ring-2 focus:outline-none ${
                errors.name ? "border-destructive" : "border-border"
              }`}
              placeholder="например, Основной сервер"
            />
            {errors.name && (
              <p className="text-destructive mt-1 text-sm">{errors.name}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="ip"
              className="text-muted-foreground mb-1 block text-sm font-medium"
            >
              Хост/IP-адрес *
            </label>
            <input
              type="text"
              id="ip"
              value={formData.ip}
              onChange={handleChange("ip")}
              className={`bg-card text-foreground placeholder-muted-foreground focus:ring-ring focus:border-ring w-full rounded-md border px-3 py-2 shadow-sm focus:ring-2 focus:outline-none ${
                errors.ip ? "border-destructive" : "border-border"
              }`}
              placeholder="например, 192.168.1.100, server.local или fe80::...%eth0"
            />
            {errors.ip && (
              <p className="text-destructive mt-1 text-sm">{errors.ip}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="user"
              className="text-muted-foreground mb-1 block text-sm font-medium"
            >
              Имя пользователя *
            </label>
            <input
              type="text"
              id="user"
              value={formData.user}
              onChange={handleChange("user")}
              className={`bg-card text-foreground placeholder-muted-foreground focus:ring-ring focus:border-ring w-full rounded-md border px-3 py-2 shadow-sm focus:ring-2 focus:outline-none ${
                errors.user ? "border-destructive" : "border-border"
              }`}
              placeholder="например, root"
            />
            {errors.user && (
              <p className="text-destructive mt-1 text-sm">{errors.user}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="ssh_port"
              className="text-muted-foreground mb-1 block text-sm font-medium"
            >
              Порт SSH
            </label>
            <input
              type="number"
              id="ssh_port"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              value={formData.ssh_port ?? 22}
              onChange={handleChange("ssh_port")}
              className={`bg-card text-foreground placeholder-muted-foreground focus:ring-ring focus:border-ring w-full rounded-md border px-3 py-2 shadow-sm focus:ring-2 focus:outline-none ${
                errors.ssh_port ? "border-destructive" : "border-border"
              }`}
              placeholder="22"
              min={1}
              max={65535}
            />
            {errors.ssh_port && (
              <p className="text-destructive mt-1 text-sm">{errors.ssh_port}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="auth_type"
              className="text-muted-foreground mb-1 block text-sm font-medium"
            >
              Тип авторизации *
            </label>
            <select
              id="auth_type"
              value={formData.auth_type ?? "password"}
              onChange={handleChange("auth_type")}
              className="bg-card text-foreground focus:ring-ring focus:border-ring border-border w-full rounded-md border px-3 py-2 shadow-sm focus:ring-2 focus:outline-none"
            >
              <option value="password">Только пароль</option>
              <option value="key">Только SSH-ключ</option>
            </select>
          </div>

          {colorCodingEnabled && (
            <div>
              <label
                htmlFor="color"
                className="text-muted-foreground mb-1 block text-sm font-medium"
              >
                Цвет сервера
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  id="color"
                  value={formData.color ?? "#3b82f6"}
                  onChange={handleChange("color")}
                  className="border-border h-10 w-20 cursor-pointer rounded border"
                />
                <span className="text-muted-foreground text-sm">
                  Выберите цвет для визуальной идентификации этого сервера
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Password Authentication */}
        {formData.auth_type === "password" && (
          <div>
            <label
              htmlFor="password"
              className="text-muted-foreground mb-1 block text-sm font-medium"
            >
              Пароль *
            </label>
            <input
              type="password"
              id="password"
              value={formData.password ?? ""}
              onChange={handleChange("password")}
              className={`bg-card text-foreground placeholder-muted-foreground focus:ring-ring focus:border-ring w-full rounded-md border px-3 py-2 shadow-sm focus:ring-2 focus:outline-none ${
                errors.password ? "border-destructive" : "border-border"
              }`}
              placeholder="Введите пароль"
            />
            {errors.password && (
              <p className="text-destructive mt-1 text-sm">{errors.password}</p>
            )}
            <p className="text-muted-foreground mt-1 text-xs">
              Рекомендуется использовать SSH-ключ по возможности. Специальные символы (например,{" "}
              <code className="rounded bg-muted px-0.5">{"{ } $ \" '"}</code>) поддерживаются.
            </p>
          </div>
        )}

        {/* SSH Key Authentication */}
        {formData.auth_type === "key" && (
          <div className="space-y-4">
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-muted-foreground block text-sm font-medium">
                  Закрытый SSH-ключ *
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateKeyPair}
                  disabled={isGeneratingKey}
                  className="gap-2"
                >
                  <Key className="h-4 w-4" />
                  {isGeneratingKey ? "Генерация..." : "Сгенерировать пару ключей"}
                </Button>
              </div>

              {/* Show manual key input only if no key has been generated */}
              {!formData.key_generated && (
                <>
                  <SSHKeyInput
                    value={formData.ssh_key ?? ""}
                    onChange={handleSSHKeyChange}
                    onError={setSshKeyError}
                  />
                  {errors.ssh_key && (
                    <p className="text-destructive mt-1 text-sm">
                      {errors.ssh_key}
                    </p>
                  )}
                  {sshKeyError && (
                    <p className="text-destructive mt-1 text-sm">
                      {sshKeyError}
                    </p>
                  )}
                </>
              )}

              {/* Show generated key status */}
              {formData.key_generated && (
                <div className="bg-success/10 border-success/20 rounded-md border p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <svg
                        className="text-success h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                           strokeLinecap="round"
                           strokeLinejoin="round"
                           strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span className="text-success-foreground text-sm font-medium">
                        Пара SSH-ключей успешно сгенерирована
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPublicKeyModal(true)}
                      className="border-info/20 text-info bg-info/10 hover:bg-info/20 gap-2"
                    >
                      <Key className="h-4 w-4" />
                      Показать публичный ключ
                    </Button>
                  </div>
                  <p className="text-success/80 mt-1 text-xs">
                    Закрытый ключ сгенерирован и будет сохранен вместе с сервером.
                  </p>
                </div>
              )}
            </div>

            <div>
              <label
                htmlFor="ssh_key_passphrase"
                className="text-muted-foreground mb-1 block text-sm font-medium"
              >
                Кодовая фраза SSH-ключ (необязательно)
              </label>
              <input
                type="password"
                id="ssh_key_passphrase"
                value={formData.ssh_key_passphrase ?? ""}
                onChange={handleChange("ssh_key_passphrase")}
                className="bg-card text-foreground placeholder-muted-foreground focus:ring-ring focus:border-ring border-border w-full rounded-md border px-3 py-2 shadow-sm focus:ring-2 focus:outline-none"
                placeholder="Введите кодовую фразу для зашифрованного ключа"
              />
              <p className="text-muted-foreground mt-1 text-xs">
                Требуется только в том случае, если ваш SSH-ключ зашифрован кодовой фразой
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-col justify-end space-y-2 pt-4 sm:flex-row sm:space-y-0 sm:space-x-3">
          {isEditing && onCancel && (
            <Button
              type="button"
              onClick={onCancel}
              variant="outline"
              size="default"
              className="order-2 w-full sm:order-1 sm:w-auto"
            >
              Отмена
            </Button>
          )}
          <Button
            type="submit"
            variant="default"
            size="default"
            className="order-1 w-full sm:order-2 sm:w-auto"
          >
            {isEditing ? "Обновить сервер" : "Добавить сервер"}
          </Button>
        </div>
      </form>

      {/* Public Key Modal */}
      <PublicKeyModal
        isOpen={showPublicKeyModal}
        onClose={() => setShowPublicKeyModal(false)}
        publicKey={generatedPublicKey}
        serverName={formData.name || "Новый сервер"}
        serverIp={formData.ip}
      />
    </>
  );
}
